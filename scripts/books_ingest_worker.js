const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const BOOKS_PATH = process.env.OLLAMA_BOOKS_PATH;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'gemma3:4b';
const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'http://127.0.0.1:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

const TMP_DIR = path.resolve(process.env.BOOKS_INGEST_TMP_DIR || path.resolve(__dirname, '../tmp/books-ingest'));
const STATE_PATH = path.resolve(process.env.BOOKS_INGEST_STATE_PATH || path.join(TMP_DIR, 'state.json'));
const MAX_PAGES = Number(process.env.BOOKS_INGEST_MAX_PAGES || '6');
const SUMMARY_SOURCE_CHARS = Number(process.env.BOOKS_INGEST_SUMMARY_SOURCE_CHARS || '1200');
const MAX_TEXT_CHARS = Number(process.env.BOOKS_INGEST_MAX_TEXT_CHARS || '2500');
const MAX_OUTPUTS = Number(process.env.BOOKS_INGEST_MAX_OUTPUTS || '3');
const ENABLE_VISION_FALLBACK = process.env.BOOKS_ENABLE_VISION === '1';
const PUBLISH_SOURCE_CHARS = Number(process.env.BOOKS_INGEST_PUBLISH_SOURCE_CHARS || '1200');
const DEFAULT_TYPES = (process.env.BOOKS_INGEST_TYPES || 'course,recipe,ingredient')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    limit: Number(process.env.BOOKS_MAX_FILES || '3'),
    filePattern: '',
    types: DEFAULT_TYPES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--limit') {
      options.limit = Number(argv[index + 1] || options.limit);
      index += 1;
      continue;
    }
    if (arg === '--file') {
      options.filePattern = String(argv[index + 1] || '').toLowerCase();
      index += 1;
      continue;
    }
    if (arg === '--types') {
      options.types = String(argv[index + 1] || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
    }
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadState() {
  ensureDir(path.dirname(STATE_PATH));
  if (!fs.existsSync(STATE_PATH)) {
    return { files: {} };
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (error) {
    console.warn('[books] No se pudo leer el estado previo, se reiniciara.');
    return { files: {} };
  }
}

function saveState(state) {
  ensureDir(path.dirname(STATE_PATH));
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function walkBooks(rootDir) {
  const entries = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const dirEntries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of dirEntries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && fullPath.toLowerCase().endsWith('.pdf')) {
        entries.push(fullPath);
      }
    }
  }

  return entries.sort((a, b) => a.localeCompare(b));
}

function fileFingerprint(filePath) {
  const stats = fs.statSync(filePath);
  return `${stats.size}:${stats.mtimeMs}`;
}

function truncate(value, maxChars) {
  const text = String(value || '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function extractPdfContext(filePath) {
  const result = spawnSync(
    'python',
    [
      path.resolve(__dirname, 'extract_book_pdf.py'),
      '--path',
      filePath,
      '--out-dir',
      TMP_DIR,
      '--max-pages',
      String(MAX_PAGES),
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `No se pudo extraer el PDF: ${filePath}`);
  }

  const payload = JSON.parse(result.stdout);
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

async function ollamaChat({ model, messages, format, temperature = 0.2, numCtx = 2048, numPredict = 512 }) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(format ? { format } : {}),
      options: {
        temperature,
        num_ctx: numCtx,
        num_predict: numPredict,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.message?.content?.trim();
  if (content) {
    return content;
  }

  const thinking = data?.message?.thinking?.trim();
  if (thinking) {
    throw new Error(`El modelo ${model} devolvio solo reasoning y no contenido util.`);
  }

  throw new Error(`Respuesta vacia del modelo ${model}.`);
}

function imagePayload(imagePath) {
  return fs.readFileSync(imagePath).toString('base64');
}

async function buildGroundingFromImages(extraction) {
  const selectedImages = extraction.images.slice(0, 4).map(imagePayload);
  const prompt = [
    'Analiza estas paginas de un libro gastronomico y responde solo JSON valido.',
    'Extrae y sintetiza informacion util para generar contenido editorial riguroso.',
    'Devuelve este formato exacto:',
    '{"summary":"...","key_topics":["..."],"recipe_clues":["..."],"ingredient_clues":["..."],"course_clues":["..."]}',
  ].join(' ');

  const content = await ollamaChat({
    model: OLLAMA_VISION_MODEL,
    format: 'json',
    temperature: 0.1,
    numCtx: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
        images: selectedImages,
      },
    ],
  });

  return JSON.parse(content);
}

async function buildGroundingFromText(extraction) {
  const prompt = [
    'Resume este libro gastronomico para ingesta editorial.',
    'Responde solo JSON valido con este formato:',
    '{"summary":"...","key_topics":["..."],"recipe_clues":["..."],"ingredient_clues":["..."],"course_clues":["..."]}',
    `Contenido fuente: ${truncate(extraction.text, SUMMARY_SOURCE_CHARS)}`,
  ].join(' ');

  const content = await ollamaChat({
    model: OLLAMA_MODEL,
    format: 'json',
    temperature: 0.1,
    numCtx: 1536,
    numPredict: 384,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(content);
}

function buildGroundingText(extraction, analysis) {
  const chunks = [
    `Libro: ${extraction.title}`,
    `Archivo: ${extraction.file}`,
    `Paginas muestreadas: ${extraction.sample_pages.join(', ')}`,
    `Resumen: ${analysis.summary || ''}`,
    `Temas clave: ${(analysis.key_topics || []).join('; ')}`,
    `Pistas de curso: ${(analysis.course_clues || []).join('; ')}`,
    `Pistas de receta: ${(analysis.recipe_clues || []).join('; ')}`,
    `Pistas de ingredientes: ${(analysis.ingredient_clues || []).join('; ')}`,
  ];

  if (extraction.text && extraction.text.trim()) {
    chunks.push(`Extracto literal: ${truncate(extraction.text, MAX_TEXT_CHARS)}`);
  }

  return truncate(chunks.filter(Boolean).join('\n'), MAX_TEXT_CHARS);
}

async function planOutputs(extraction, groundingText, allowedTypes) {
  const typeList = allowedTypes.map((value) => value.toUpperCase()).join(', ');
  const prompt = [
    'Eres el director editorial de AURA GASTRONOMY.',
    `Solo puedes proponer estos tipos: ${typeList}.`,
    `Devuelve como maximo ${MAX_OUTPUTS} propuestas, sin inventar nada fuera de la fuente.`,
    'Cada propuesta debe quedar lista para publicarse en Aura.',
    'Responde solo JSON valido con este formato:',
    '{"items":[{"type":"COURSE|RECIPE|INGREDIENT","tier":"FREE|PRO|PREMIUM","title":"...","details":"..."}]}',
    `Fuente: ${groundingText}`,
  ].join(' ');

  const content = await ollamaChat({
    model: OLLAMA_MODEL,
    format: 'json',
    temperature: 0.15,
    numCtx: 1536,
    numPredict: 320,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = JSON.parse(content);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items
    .map((item) => ({
      type: String(item.type || '').toUpperCase(),
      tier: String(item.tier || 'PREMIUM').toUpperCase(),
      title: truncate(item.title || extraction.title, 160),
      details: truncate(item.details || groundingText, 2000),
    }))
    .filter((item) => ['COURSE', 'RECIPE', 'INGREDIENT'].includes(item.type))
    .filter((item) => allowedTypes.includes(item.type.toLowerCase()))
    .slice(0, MAX_OUTPUTS);
}

async function publishOutput(payload) {
  const response = await fetch(`${WORKER_BASE_URL}/api/bots/ingest-book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(INTERNAL_API_SECRET ? { 'x-internal-api-key': INTERNAL_API_SECRET } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ingest route error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function processBook(filePath, state, options) {
  const fingerprint = fileFingerprint(filePath);
  const previous = state.files[filePath];
  if (!options.force && previous?.fingerprint === fingerprint && previous?.status === 'completed') {
    console.log(`[skip] ${path.basename(filePath)} ya procesado`);
    return;
  }

  console.log(`[book] ${path.basename(filePath)}`);
  const extraction = extractPdfContext(filePath);
  if (extraction.needs_vision && !ENABLE_VISION_FALLBACK) {
    throw new Error('OCR insuficiente para este libro y BOOKS_ENABLE_VISION no esta activado.');
  }

  const analysis =
    extraction.needs_vision && ENABLE_VISION_FALLBACK
      ? await buildGroundingFromImages(extraction)
      : await buildGroundingFromText(extraction);
  const groundingText = buildGroundingText(extraction, analysis);
  const plan = await planOutputs(extraction, groundingText, options.types);

  const entry = {
    fingerprint,
    processedAt: new Date().toISOString(),
    status: 'completed',
    title: extraction.title,
    samplePages: extraction.sample_pages,
    mode: extraction.needs_vision ? 'vision' : extraction.ocr_used ? 'ocr' : 'text',
    groundingHash: sha1(groundingText),
    groundingPreview: truncate(groundingText, 1400),
    plan,
    outputs: [],
  };

  if (!options.dryRun) {
    for (const item of plan) {
      console.log(`  -> ${item.type} | ${item.tier} | ${item.title}`);
      const result = await publishOutput({
        type: item.type,
        tier: item.tier,
        topic: item.title,
        details: truncate(item.details, 800),
        sourceText: truncate(groundingText, PUBLISH_SOURCE_CHARS),
        sourceTitle: extraction.title,
        sourceFile: filePath,
        sourcePages: extraction.sample_pages,
        sourceMode: extraction.needs_vision ? 'vision' : extraction.ocr_used ? 'ocr' : 'text',
      });
      entry.outputs.push({
        type: item.type,
        tier: item.tier,
        title: item.title,
        insertedId: result.id,
      });
    }
  }

  state.files[filePath] = entry;
  saveState(state);
}

async function main() {
  if (!BOOKS_PATH) {
    throw new Error('Falta OLLAMA_BOOKS_PATH en .env.local');
  }

  if (!fs.existsSync(BOOKS_PATH)) {
    throw new Error(`La carpeta de libros no existe: ${BOOKS_PATH}`);
  }

  ensureDir(TMP_DIR);
  const options = parseArgs(process.argv.slice(2));
  const state = loadState();

  let files = walkBooks(BOOKS_PATH);
  if (options.filePattern) {
    files = files.filter((file) => file.toLowerCase().includes(options.filePattern));
  }
  files = files.slice(0, options.limit);

  console.log(`[books] carpeta=${BOOKS_PATH}`);
  console.log(`[books] encontrados=${files.length}`);
  console.log(`[books] dryRun=${options.dryRun ? 'si' : 'no'} types=${options.types.join(',')}`);

  for (const filePath of files) {
    try {
      await processBook(filePath, state, options);
    } catch (error) {
      console.error(`[fail] ${path.basename(filePath)} -> ${error.message}`);
      state.files[filePath] = {
        fingerprint: fileFingerprint(filePath),
        processedAt: new Date().toISOString(),
        status: 'failed',
        error: String(error.message || error),
      };
      saveState(state);
    }
  }

  console.log(`[books] estado guardado en ${STATE_PATH}`);
}

main().catch((error) => {
  console.error('[books] fatal', error.message);
  process.exit(1);
});
