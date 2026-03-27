const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function generateLessonContent(courseTitle, moduleTitle, lessonTitle) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Eres un Maestro en Gastronomía de Vanguardia. Genera el contenido técnico detallado para una lección titulada "${lessonTitle}" que pertenece al módulo "${moduleTitle}" del curso "${courseTitle}". El contenido debe incluir: una introducción teórica profunda, pasos técnicos precisos y consejos de chef. Responde en formato MARKDOWN técnico y profesional. No incluyas el título en el cuerpo.`
          }]
        }]
      })
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Contenido técnico en revisión...';
  } catch (err) {
    console.error('Error generating content:', err.message);
    return 'Error en la generación de contenido especializado.';
  }
}

async function inject() {
  console.log('--- Iniciando Inyección de Contenido Académico Maestro ---');
  
  const { data: courses, error: cErr } = await supabase.from('courses').select('id, title');
  if (cErr) return console.error(cErr);
  
  for (const course of courses) {
    console.log(`Procesando curso: ${course.title}...`);
    
    // Check for modules
    const { data: modules, error: mErr } = await supabase.from('modules').select('id, title').eq('course_id', course.id);
    if (mErr) continue;
    
    for (const module of modules) {
      console.log(`  Módulo: ${module.title}...`);
      
      // Generate 3 specialized lessons per module
      const lessonTitles = [
        `Fundamentos Técnicos de ${module.title}`,
        `Aplicación Práctica y Casos de Estudio`,
        `Optimización y Refinamiento Maestro`
      ];
      
      for (let i = 0; i < lessonTitles.length; i++) {
        const title = lessonTitles[i];
        console.log(`    Generando lección: ${title}...`);
        
        const content = await generateLessonContent(course.title, module.title, title);
        
        const { error: lErr } = await supabase.from('lessons').insert([{
          module_id: module.id,
          title: title,
          content: content,
          duration: `${Math.floor(Math.random() * 20) + 10}m`,
          order_index: i,
          video_url: 'https://vimeo.com/aura_masterclass_placeholder'
        }]);
        
        if (lErr) console.error(`      Error insertando lección: ${lErr.message}`);
      }
    }
  }
  
  console.log('--- Inyección Completada con Éxito ---');
}

inject();
