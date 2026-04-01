const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DRIVE_FOLDER = "G:\\Mi unidad\\LIBROS COCINA";

function getBooks() {
  try {
    const files = fs.readdirSync(DRIVE_FOLDER);
    return files.filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(DRIVE_FOLDER, f));
  } catch (e) {
    console.error("No se pudo leer Google Drive:", e.message);
    return [];
  }
}

function extractText(bookPath) {
  try {
    const outDir = path.join(__dirname, '../.tmp_pdf');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    // Extraemos 8 páginas aleatorias, evitando OCR para que sea súper rápido
    const cmd = `python scripts/extract_book_pdf.py --path "${bookPath}" --out-dir "${outDir}" --max-pages 8 --min-text-chars 0`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const json = JSON.parse(result.trim());
    return json.text || "";
  } catch (e) {
    console.error(`Error extrayendo de ${bookPath}:`, e.message);
    return "";
  }
}

const GEMINI_KEYS = [
  "AIzaSyBIWzM25LcpUSH3lYxuqNSDb9E4oL6wV5Y",
  "AIzaSyA7E48usjwy_StTvDo0ub7Q3urNS9j8y3w",
  "AIzaSyBmWLNwQ4IWaxgk6EJfztjJ5o_o3uR6Jwk"
];

async function askGroq(prompt, systemContext = "") {
  // 1. Intentar Groq Primero (Más Rápido)
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemContext }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const data = await res.json();
    if (data.choices) return JSON.parse(data.choices[0].message.content);
  } catch (e) {}

  // 2. Fallback a Carrusel de Gemini Keys
  for (const key of GEMINI_KEYS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemContext }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await res.json();
      if (data.candidates) return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (e) {}
  }
  return null;
}

async function processCourses() {
  const books = getBooks();
  console.log(`Encontrados ${books.length} libros en G:\\Mi unidad\\LIBROS COCINA`);

  const { data: courses } = await aDb.from('courses').select('id, title, tier').order('course_order');
  
  for (let c = 0; c < courses.length; c++) {
    const course = courses[c];
    console.log(`\\n[${c+1}/${courses.length}] Curso: ${course.title} (${course.tier})`);
    
    // Obtenemos todos los módulos y lecciones
    const { data: modules } = await aDb.from('modules').select('id, title').eq('course_id', course.id);
    if (!modules || modules.length === 0) continue;
    
    let allLessons = [];
    for (const mod of modules) {
      const { data: lessons } = await aDb.from('lessons').select('id, title').eq('module_id', mod.id);
      if (lessons) {
        lessons.forEach(l => allLessons.push({ ...l, module_title: mod.title }));
      }
    }

    if (allLessons.length === 0) continue;

    // Extraemos texto de un libro aleatorio
    let extractedText = "";
    let attempts = 0;
    while (extractedText.length < 500 && attempts < 3 && books.length > 0) {
      const randomBook = books[Math.floor(Math.random() * books.length)];
      console.log(`  Leyendo contexto de: ${path.basename(randomBook)}`);
      extractedText = extractText(randomBook);
      attempts++;
    }

    // Limitamos el texto a ~3000 caracteres para no exceder los límites de tokens gratuitos (TPM)
    const contextText = extractedText.substring(0, 3000);

    for (let l = 0; l < allLessons.length; l++) {
      const lesson = allLessons[l];
      console.log(`    -> [Lección ${l+1}/${allLessons.length}] ${lesson.title}`);

      const systemPrompt = `Eres un educador gastronómico y chef de vanguardia mundial dictando el curso "${course.title}".`;
      
      const userPrompt = `
Crea el contenido teórico PROFESIONAL para la lección **"${lesson.title}"** (módulo: "${lesson.module_title}").

MUY IMPORTANTE: 
1. Redacta de 150 a 300 palabras estructuradas (Markdown, listas o negritas si aplica).
2. Tienes EXTRICTA PROHIBICIÓN de usar intros genéricas repetitivas como "En este módulo veremos...". Ve directamente a la parte técnica dura (grados, pH, emulsiones, proteínas, técnicas contemporáneas).
3. Utiliza conceptos avanzados reales que encuentres en el siguiente extracto bibliográfico (si es relevante) o de tu base interna si es mejor:
   
EXTRACTO BIBLIOGRÁFICO:
${contextText || '(Usa tu conocimiento premium técnico)'}

Devuelve un JSON estrictamente válido con esta estructura:
{
  "content": "Contenido puramente técnico y asombroso en Markdown Markdown aquí"
}
`;

      const result = await askGroq(userPrompt, systemPrompt);
      
      if (result && result.content) {
        await aDb.from('lessons').update({ content: result.content }).eq('id', lesson.id);
        console.log(`      ✓ Guardada`);
      } else {
        console.log(`      x Falló el formato`);
      }
      
      // Espera mínima para que el disco respire
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function main() {
  console.log('--- GENERADOR DE CONTENIDOS CON ORO LIQUIDO (GROQ & G-DRIVE) ---');
  await processCourses();
  console.log('--- COMPLETADO ---');
}

main().catch(console.error);
