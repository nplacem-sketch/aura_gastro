const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const DRIVE_FOLDER = "G:\\Mi unidad\\LIBROS COCINA";
const GEMINI_KEYS = [
  "AIzaSyA7E48usjwy_StTvDo0ub7Q3urNS9j8y3w",
  "AIzaSyBmWLNwQ4IWaxgk6EJfztjJ5o_o3uR6Jwk"
];

function getBooks() {
  try { return fs.readdirSync(DRIVE_FOLDER).filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(DRIVE_FOLDER, f)); }
  catch (e) { return []; }
}

async function askGemini(prompt, systemContext, key) {
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
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) { return null; }
}

async function main() {
  const books = getBooks();
  const { data: courses } = await aDb.from('courses').select('id, title').order('course_order');
  let keyIdx = 0;

  for (const course of courses) {
    const { data: lessons } = await aDb.from('lessons').select('id, title, module_id(title)').eq('course_id', course.id);
    if (!lessons) continue;

    for (const lesson of lessons) {
      console.log(`Working on: ${lesson.title}`);
      const key = GEMINI_KEYS[keyIdx % GEMINI_KEYS.length];
      const result = await askGemini(`Genera contenido tecnico para ${lesson.title}`, `Chef Pro`, key);
      if (result && result.content) {
        await aDb.from('lessons').update({ content: result.content }).eq('id', lesson.id);
        keyIdx++;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
main();
