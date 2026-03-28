const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const rDb = createClient(process.env.SUPABASE_RECIPES_URL, process.env.SUPABASE_RECIPES_SERVICE_KEY);
const aDb = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const rlsDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); // Just in case, though we don't need it

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt, isJSON = true) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: isJSON ? "application/json" : "text/plain",
          }
        })
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      let text = data.candidates[0].content.parts[0].text;
      
      if (isJSON) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      }
      return text;
    } catch (e) {
      console.log(`  [Gemini Error] (intento ${attempt+1}): ${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return null;
}

async function generateRecipes() {
  console.log('\\n--- Generando 14 RECETAS profesionales ---');
  const { data: recipes } = await rDb.from('recipes').select('id, title, tier, prep_time, difficulty');

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    console.log(`Receta ${i+1}/${recipes.length}: ${r.title} (${r.tier})`);
    
    // Clear old steps and ingredients
    await rDb.from('recipe_ingredients').delete().eq('recipe_id', r.id);
    await rDb.from('recipe_steps').delete().eq('recipe_id', r.id);

    const prompt = `
Eres un Chef de Alta Cocina con estrellas Michelin preparador de recetas magistrales rigurosas.
Crea la receta completa de "${r.title}". El nivel es ${r.tier}.
MANDATORIO:
1. No inventar ingredientes falsos ni técnicas que no existan.
2. Ingredientes con cantidades exactas y reales (ej: 15 g, 200 ml).
3. Tiempo de elaboración real y preciso. Comensales: 4. Utensilios necesarios obligatorios.
4. Pasos MUY extensos, súper profesionales, explícitos, detallando temperatura, técnica, control visual y texturas. NO usar textos repetitivos como "Aborda el paso...". Cada paso debe ser un párrafo detallado indicando cómo y por qué se hace cada acción, qué utensilios usar, etc.
5. EL ÚLTIMO PASO OBLIGATORIAMENTE debe ser el subtítulo "MARIDAJE:" seguido del vino o bebida recomendado para acompañar y su justificación gustativa.

Devuelve EXACTAMENTE este formato JSON:
{
  "prep_time": "1h 30m",
  "difficulty": "Alta",
  "description": "Breve párrafo descriptivo técnico de la receta y su perfil de sabor.",
  "ingredients": [ { "name": "Sal", "quantity": "10", "unit": "g" } ],
  "steps": [ "1. Paso 1 detallado...", "2. Paso 2 detallado...", ..., "7. MARIDAJE: Para esta elaboración recomendamos un Chardonnay maduro..." ]
}
`;
    
    const result = await askGemini(prompt, true);
    if (!result) continue;

    await rDb.from('recipes').update({
      prep_time: result.prep_time,
      difficulty: result.difficulty,
      description: result.description,
      status: 'VERIFIED_UNIT'
    }).eq('id', r.id);

    if (result.ingredients?.length) {
      const inserts = result.ingredients.map(ing => ({
        recipe_id: r.id,
        name: ing.name,
        quantity: String(ing.quantity || ''),
        unit: ing.unit || '',
        category: 'DEFAULT',
      }));
      await rDb.from('recipe_ingredients').insert(inserts);
    }

    if (result.steps?.length) {
      const inserts = result.steps.map((st, idx) => ({
        recipe_id: r.id,
        step_number: idx + 1,
        instruction: st
      }));
      await rDb.from('recipe_steps').insert(inserts);
    }
  }
}

async function generateCourses() {
  console.log('\\n--- Generando 40 CURSOS sin repeticiones ---');
  const { data: courses } = await aDb.from('courses').select('id, title, tier, course_order');
  
  // To speed up, we will do batches of 5 courses concurrently
  const batchSize = 5;
  for (let i = 0; i < courses.length; i += batchSize) {
    const batch = courses.slice(i, i + batchSize);
    console.log(`Procesando cursos del ${i+1} al ${i + batch.length} de ${courses.length}...`);

    await Promise.all(batch.map(async (c) => {
      // Find modules and lessons
      const { data: modules } = await aDb.from('course_modules').select('id, title, module_order').eq('course_id', c.id).order('module_order');
      if (!modules || modules.length === 0) return;

      for (const m of modules) {
        const { data: lessons } = await aDb.from('lessons').select('id, title, lesson_order').eq('module_id', m.id).order('lesson_order');
        if (!lessons) continue;

        const titles = lessons.map(l => l.title).join(', ');
        
        const prompt = `
Eres un Instructor de Alta Gastronomía. Escribe el contenido de las lecciones del módulo "${m.title}" del curso "${c.title}" (Nivel: ${c.tier}).
Son lecciones de dificultad profesional, sin inventos, ni alucinaciones, ni frases de relleno o repetitivas.
Debe ser contenido extenso, valioso, técnico y diferente para cada lección.
Las lecciones a redactar son: ${titles}.

Devuelve OBLIGATORIAMENTE este formato JSON:
{
  "lessons_content": [
    { "title": "...", "content": "Párrafos súper detallados con teoría química o culinaria aplicable, historia breve, y aplicación técnica real de 300 palabras mínimo..." },
    ...
  ]
}
`;
        const res = await askGemini(prompt, true);
        if (res && res.lessons_content) {
          for (let k = 0; k < lessons.length; k++) {
            const lc = res.lessons_content.find(rc => rc.title.toLowerCase().includes(lessons[k].title.toLowerCase()) || rc.title === lessons[k].title);
            if (lc && lc.content && lc.content.length > 50) {
              await aDb.from('lessons').update({
                content: lc.content,
                video_url: null,
                duration_minutes: 15
              }).eq('id', lessons[k].id);
            }
          }
        }
      }

      // Generar 1 exam detallado para el curso (10 preguntas reales)
      const examPrompt = `Crea un examen real de 10 preguntas técnicas sobre "${c.title}". Respuestas serias, de opción múltiple, 1 correcta. Formato JSON:
{
  "questions": [
    { "question": "¿...?", "options": ["A", "B", "C", "D"], "correct_index": 0 }, ...
  ]
}`;
      const eRes = await askGemini(examPrompt, true);
      if (eRes && eRes.questions) {
        const { data: exams } = await aDb.from('exams').select('id').eq('course_id', c.id);
        if (exams && exams[0]) {
          await aDb.from('exam_questions').delete().eq('exam_id', exams[0].id);
          const qInserts = eRes.questions.map((q, qIndex) => ({
            exam_id: exams[0].id,
            question_text: q.question,
            options: q.options,
            correct_option_index: q.correct_index,
            points: 10,
            question_order: qIndex + 1
          }));
          await aDb.from('exam_questions').insert(qInserts);
        }
      }
      console.log(`   -> OK Curso: ${c.title}`);
    }));
  }
}

async function run() {
  await generateRecipes();
  await generateCourses();
  console.log('\\n--- PROCESO COMPLETADO ---');
}

run();
