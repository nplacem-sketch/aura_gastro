const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DRIVE_FOLDER = "G:\\\\Mi unidad\\\\LIBROS COCINA";

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

async function askGroq(prompt, systemContext = "") {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemContext || "Eres un maestro gastronómico riguroso. Responde solo el JSON válido sin backticks." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (e) {
      console.log(`  [Groq Error] (intento ${attempt}): ${e.message}`);
      if (e.message.includes('Rate limit') || e.message.includes('429')) {
        await new Promise(r => setTimeout(r, 10000));
      } else {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
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

    const systemPrompt = `
Eres un educador gastronómico de élite mundial diseñando un currículo.
Utiliza la información del siguiente EXTRACTO BIBLIOGRÁFICO para inspirarte y sacar hechos reales, químicos o históricos que agreguen peso y veracidad técnica a las lecciones. REESTRUCTURA Y NO COPIES LITERALMENTE. NO inventes hechos falsos ni alucines.

EXTRACTO DE LIBRO:
${contextText || '(Sin extracto disponible, usa base técnica genérica)'}
`;

    const userPrompt = `
Genera el contenido para ${allLessons.length} lecciones del curso "${course.title}" (Nivel ${course.tier}).
MUY IMPORTANTE: 
1. Cada lección OBLIGATORIAMENTE debe ser ÚNICA y de 250 a 400 palabras. PROHIBIDO repetir párrafos entre lecciones.
2. Contenido puramente profesional: técnicas, parámetros (temperaturas exactas, tiempos, ph), reacciones químicas o físicas descritas en el libro. 

Lecciones a generar:
${allLessons.map(l => `- ID [${l.id}] Módulo: ${l.module_title} - Lección: ${l.title}`).join('\\n')}

Devuelve un JSON estricto con esta estructura:
{
  "lessons": [
    {
      "id": "el ID exacto correspondiente",
      "content": "El contenido teórico en formato Markdown. No empieces con el ID. Desarrolla introduccion, aplicación y técnica usando la bibliografia."
    }
  ]
}
`;

    const result = await askGroq(userPrompt, systemPrompt);
    if (result && result.lessons) {
      for (const resLesson of result.lessons) {
        if (!resLesson.id || !resLesson.content) continue;
        const validId = allLessons.find(l => l.id === resLesson.id);
        if (validId) {
          await aDb.from('lessons').update({ content: resLesson.content }).eq('id', validId.id);
        }
      }
      console.log(`  -> Actualizadas ${result.lessons.length} lecciones con éxito vía Groq.`);
    } else {
      console.log(`  -> ERROR: No se generó contenido para el curso.`);
    }
    
    // Pausa para evitar Rate Limits drásticos
    await new Promise(r => setTimeout(r, 4000));
  }
}

async function main() {
  console.log('--- GENERADOR DE CONTENIDOS CON ORO LIQUIDO (GROQ & G-DRIVE) ---');
  await processCourses();
  console.log('--- COMPLETADO ---');
}

main().catch(console.error);
