/**
 * convert_md_recipes.js
 * Lee archivos .md de recetas, los limpia y genera un JSON
 * compatible con import_manual_recipes.js para Supabase.
 *
 * Uso:
 *   node scripts/convert_md_recipes.js --dir "C:\Users\Casa\Downloads\cursos\recetario" --out scripts/recetas_generadas.json
 *   Luego: node scripts/import_manual_recipes.js --file scripts/recetas_generadas.json --apply
 */

const fs = require('fs');
const path = require('path');

// ─── Patrones de limpieza ─────────────────────────────────────────────────────

const REF_PATTERN = /\s*\[\d[\d,.\-\s]*\]/g;

const AI_FILLER_PHRASES = [
  'Debido a una limitación',
  'he procedido a redactar',
  'directamente aquí',
  'Esta elaboración es un ejercicio de',
  'Espero que te sirva',
  'Aquí tienes',
  'A continuación te presento',
  'Este texto',
  '¿Deseas que',
  '¿Deseas continuar',
];

// ─── Limpieza ─────────────────────────────────────────────────────────────────

function removeDuplicateH1(text) {
  const lines = text.split('\n');
  const result = [];
  let lastH1 = null;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (line === lastH1) continue;
      lastH1 = line;
    }
    result.push(line);
  }
  return result.join('\n');
}

function removeAIFiller(text) {
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    const isFiller = AI_FILLER_PHRASES.some((p) => line.includes(p));
    if (!isFiller) result.push(line);
  }
  return result.join('\n');
}

function cleanMarkdown(raw) {
  let text = raw;
  text = removeDuplicateH1(text);
  text = removeAIFiller(text);
  text = text.replace(REF_PATTERN, '');
  // Colapsar líneas vacías múltiples
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

// ─── Extracción de datos ──────────────────────────────────────────────────────

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Sin título';
}

function extractDifficulty(text) {
  if (/vanguardia extrema|profesional.*alta|maestro/i.test(text)) return 'Maestro';
  if (/avanzado/i.test(text)) return 'Avanzado';
  if (/intermedio/i.test(text)) return 'Intermedio';
  if (/b[áa]sico/i.test(text)) return 'Basico';
  return 'Maestro';
}

function extractPrepTime(text) {
  const match = text.match(/tiempo[^:\n|]*[:|]\s*\*?\*?([^*|\n]+)/i);
  if (match) return match[1].replace(REF_PATTERN, '').replace(/\*\*/g, '').trim();
  return null;
}

function extractCategory(text) {
  const lc = text.toLowerCase();
  if (/postre|chocolate|dulce/.test(lc)) return 'Postre';
  if (/ostra|vieira|bogavante|pescado|roca|alga|mar/.test(lc)) return 'Pescados y Mariscos';
  if (/carne|papada|ibéric|cerdo|vacuno/.test(lc)) return 'Carnes';
  if (/espárrago|guisante|vegetal|verdura/.test(lc)) return 'Vegetales';
  if (/sopa|consomé|caldo/.test(lc)) return 'Sopas';
  if (/huevo/.test(lc)) return 'Huevos';
  return 'Vanguardia';
}

function extractIngredients(text) {
  const ingredients = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Los MD tienen markdown escapado con backslash: \*\* y \*
    const clean = line
      .replace(/\\\*/g, '')      // eliminar \*
      .replace(/\*\*/g, '')      // eliminar ** residual
      .replace(/\*/g, '')        // eliminar * residual
      .replace(/^\s*\s*/, '')    // limpiar espacios inicio
      .replace(REF_PATTERN, '')  // eliminar [1], [2-4] etc
      .replace(/\$[^$]+\$/g, '') // fórmulas matemáticas $N_2O$
      .trim();


    if (!clean || clean.startsWith('#') || clean.startsWith('|') || clean.startsWith('>')) continue;

    // Patrón 1: "X g de Nombre …"  →  "100 g de Agua destilada"
    const p1 = clean.match(/^([\d.,]+)\s*(g|ml|kg|l|cl|ud|u|pz)\s+(?:de\s+)?([^(.\[]+)/i);
    if (p1) {
      const name = p1[3].trim().replace(/[,;.]$/, '');
      if (name.split(' ').length <= 8) {
        ingredients.push({ name, quantity: p1[1].replace(',', '.'), unit: p1[2].toLowerCase() });
        continue;
      }
    }

    // Patrón 2: "Nombre (info): X g"  o  "Nombre: X g"
    const p2 = clean.match(/^([A-ZÁÉÍÓÚ][^:(\d]{2,40}?)\s*(?:\([^)]*\))?\s*:\s*([\d.,]+)\s*(g|ml|kg|l|cl|ud|u|pz)/i);
    if (p2) {
      const name = p2[1].replace(/\([^)]*\)/g, '').trim();
      ingredients.push({ name, quantity: p2[2].replace(',', '.'), unit: p2[3].toLowerCase() });
      continue;
    }

    // Patrón 3: "X unidades de Nombre"
    const p3 = clean.match(/^(\d+)\s+(?:unidad(?:es)?|pieza|pz)\s+(?:de\s+)?([^(.\[]{3,40})/i);
    if (p3) {
      const name = p3[2].trim().replace(/[,;.]$/, '');
      ingredients.push({ name, quantity: p3[1], unit: 'ud' });
    }
  }

  // Deduplicar por nombre
  const seen = new Set();
  return ingredients.filter((ing) => {
    if (seen.has(ing.name)) return false;
    seen.add(ing.name);
    return true;
  });
}

function extractSteps(text) {
  const steps = [];
  const lines = text.split('\n');
  let inStepsSection = false;

  for (const line of lines) {
    if (/paso a paso|protocolo de preparaci|elaboraci[oó]n|procedimiento/i.test(line) && line.startsWith('#')) {
      inStepsSection = true;
      continue;
    }
    if (inStepsSection && /^#{1,2}\s/.test(line) && !/paso|protocolo|elaboraci/i.test(line)) {
      inStepsSection = false;
    }
    if (!inStepsSection) continue;

    const stepLine = line
      .replace(/^\s*\*+\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\*\*/g, '')
      .replace(REF_PATTERN, '')
      .trim();

    if (stepLine.length > 20 && !stepLine.startsWith('#') && !stepLine.startsWith('|')) {
      steps.push(stepLine);
    }
  }

  // Fallback: coger todos los párrafos largos
  if (steps.length === 0) {
    for (const line of lines) {
      const clean = line.replace(/^\s*\*+\s*/, '').replace(/\*\*/g, '').replace(REF_PATTERN, '').trim();
      if (clean.length > 50 && !clean.startsWith('#') && !clean.startsWith('|')) {
        steps.push(clean);
      }
    }
  }

  return steps.slice(0, 30);
}

function extractRaciones(text) {
  const match = text.match(/raciones?\s*[:|]\s*(\d+)\s*pax/i);
  return match ? `${match[1]} pax` : null;
}

function extractAllergens(text) {
  const map = {
    Gluten: /gluten|harina|pan|sémola|masa/i,
    Lácteos: /mantequilla|nata|leche|queso|crema|ghee/i,
    Huevo: /huevo|albúmina/i,
    Mariscos: /bogavante|vieira|ostra|gamba|langostino|crustáceo|marisco/i,
    Pescado: /pescado|roca|trucha|salmón|anchoa/i,
    Soja: /soja|lecitina de soja/i,
    'Frutos secos': /piñón|almendra|avellana|nuez/i,
    Sulfitos: /vino|oporto|vinagre/i,
  };
  return Object.entries(map)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);
}

function extractDescription(text) {
  const paragraphs = text
    .split('\n\n')
    .map((p) => p.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 40 && !p.startsWith('|') && !p.startsWith('*'));
  return paragraphs.length > 0 ? paragraphs[0].slice(0, 300) : '';
}

// ─── Parse completo ───────────────────────────────────────────────────────────

function parseMdFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = cleanMarkdown(raw);

  const title = extractTitle(cleaned);
  const difficulty = extractDifficulty(cleaned);
  const prep_time = extractPrepTime(cleaned);
  const category = extractCategory(cleaned);
  const ingredients = extractIngredients(cleaned);
  const steps = extractSteps(cleaned);
  const yield_text = extractRaciones(cleaned);
  const allergens = extractAllergens(cleaned);
  const description = extractDescription(cleaned);

  return {
    title,
    description,
    tier: 'PREMIUM',
    difficulty,
    prep_time: prep_time || 'Consultar ficha',
    category,
    cover_image: null,
    tags: [category, difficulty, 'Vanguardia', 'AURA'],
    ingredients,
    steps,
    technical_sheet: {
      title,
      category,
      plan_tier: 'PREMIUM',
      yield_text: yield_text || null,
      ingredients,
      method: steps.join('\n\n'),
      plating_notes: null,
      allergens,
      cost_summary: {},
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dir: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') args.dir = argv[i + 1];
    if (argv[i] === '--out') args.out = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) {
    console.log('Uso: node scripts/convert_md_recipes.js --dir <carpeta_md> --out <salida.json>');
    process.exit(1);
  }

  const dir = path.resolve(args.dir);
  const mdFiles = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('Manual de Protocolo'))
    .map((f) => path.join(dir, f));

  console.log(`\n📂 ${mdFiles.length} recetas encontradas\n`);

  const recipes = [];
  for (const file of mdFiles) {
    try {
      const r = parseMdFile(file);
      recipes.push(r);
      console.log(`  ✓ [${r.category}] ${r.title}`);
      console.log(`    Ingredientes: ${r.ingredients.length} | Pasos: ${r.steps.length} | Alérgenos: ${r.technical_sheet.allergens.join(', ') || '—'}`);
    } catch (err) {
      console.error(`  ✗ ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log(`\n📊 Total: ${recipes.length} recetas\n`);

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, JSON.stringify(recipes, null, 2), 'utf8');
    console.log(`✅ JSON → ${outPath}`);
    console.log(`\nSiguiente paso:`);
    console.log(`  node scripts/import_manual_recipes.js --file ${args.out} --apply\n`);
  } else {
    console.log(JSON.stringify(recipes, null, 2));
  }
}

main();
