/**
 * seed_academy_ultra_pro.js — AURA GASTRONOMY (Ultra Professional Reset)
 * ─────────────────────────────────────────────────────────────────────────────
 * GOAL: 100% cleanup and re-generation of 3 professional courses.
 *       3 Courses (1 PRO, 2 PREMIUM) | 3 Modules/Course | 2 Lessons/Module
 *       ZERO Meta-talk, ZERO Hallucinations, NO Exams.
 */
'use strict';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb = createClient(
  process.env.SUPABASE_ACADEMY_URL,
  process.env.SUPABASE_ACADEMY_SERVICE_KEY
);

const OLLAMA = 'http://127.0.0.1:11434';
const MODEL  = 'qwen2.5:7b';
const delay  = ms => new Promise(r => setTimeout(r, ms));

const COURSES = [
  {
    tier: 'PRO',
    title: 'Precision Foundations: Técnica y Ciencia Culinaria',
    description: 'DOMINA los principios físico-químicos: termodinámica de precisión, emulsiones y fermentaciones avanzadas.',
    order: 1,
    modules: [
      {
        title: 'Termodinámica y Calorimetría Aplicada',
        lessons: [
          { title: 'Cinética del Calor: Conducción y Convección', facts: ['Conducción: cobre (385 W/mK) vs Acero (16 W/mK).', 'Convección forzada (Hornos Combi) acelera transferencia ~30%.', 'Penetración infrarroja: 2-3mm.'] },
          { title: 'Desnaturalización y Punto de Cuajado', facts: ['Miosina 50°C, Actina 65-70°C.', 'Colágeno a gelatina en 71°C.', 'Yema de huevo cuaja a 63-65°C.'] }
        ]
      },
      {
        title: 'Química de Emulsiones y Estabilización',
        lessons: [
          { title: 'Lecitinas y Fosfolípidos en la Cocina', facts: ['Lecitina en yema (~10%).', 'Caseína desestabiliza pH < 4.6.', 'E471 emulsiones O/A.'] },
          { title: 'Viscosidad y Suspensión: Hidrocoloides', facts: ['Xantana (0.1-0.3%) flujo pseudoplástico.', 'Goma guar potencia 5x xantana.', 'Sinergia LBG+Kappa.'] }
        ]
      },
      {
        title: 'Fermentaciones y Control del pH',
        lessons: [
          { title: 'Bacteriología Láctica en Encurtidos', facts: ['pH objetivo 3.5-4.0.', 'Lactobacillus plantarum.', 'NaCl 2% inhibición.'] },
          { title: 'Koji y Fermentación Proteica', facts: ['Aspergillus oryzae 28-32°C.', 'MSG natural en miso rojo.', 'Garum moderno (60°C).'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Cocina Molecular: Vanguardia y Criotecnia',
    description: 'PROGRAMA EXPERTO en hidrocoloides, esferificación clínica y uso de nitrógeno líquido en sala.',
    order: 2,
    modules: [
      {
        title: 'Gelificación Clínica con Hidrocoloides',
        lessons: [
          { title: 'Agar-Agar: Fusión y Termorreversibilidad', facts: ['Fusión 85-95°C, Gel 32-40°C.', 'Espaguetis agar 1%.', 'Inhibido por papaína.'] },
          { title: 'Carragenatos: Kappa vs Iota', facts: ['Kappa (firme con K+), Iota (elástico con Ca2+).', 'Activación ≥70°C.', 'Textura panna cotta.'] }
        ]
      },
      {
        title: 'Esferificación: Física de Membranas',
        lessons: [
          { title: 'Esferificación Inversa: Cal-Gluconolactato', facts: ['Ca2+ interno, alginato externo.', 'GDL neutro.', 'Permite alcoholes/lácteos.'] },
          { title: 'Grosor y Tensión Superficial en Esferas', facts: ['Na-alginato 0.5% + CaCl2 0.5%.', 'Enjuague agua destilada.', 'Estabilidad enzimática.'] }
        ]
      },
      {
        title: 'Criotecnia y Nitrógeno Líquido (N2l)',
        lessons: [
          { title: 'Expansión Gaseosa y Efecto Leidenfrost', facts: ['Temp -195.8°C.', '1L liq = 696L gas.', 'Capa aislante protectora.'] },
          { title: 'Sorbetes Flash y Protocolos Dewar', facts: ['Cristales < 5µm.', 'Dewar acero vacío.', 'Seguridad O2 min 19.5%.'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Sumillería y Maridaje Científico Avanzado',
    description: 'ANÁLISIS SENSORIAL basado en química orgánica y teorías de food pairing molecular.',
    order: 3,
    modules: [
      {
        title: 'Química Sensorial y Volátiles',
        lessons: [
          { title: 'Ésteres y Terpenos en Vinos de Calidad', facts: ['Acetato isoamilo: plátano.', 'Linalol en Albariño.', 'pH tintos 3.3-3.7.'] },
          { title: 'Fenólicos: Taninos y Antocianos', facts: ['Antocianos rojos pH < 3.5.', 'Taninos semilla astringentes.', 'IPT 40-120.'] }
        ]
      },
      {
        title: 'Food Pairing Molecular y Umami',
        lessons: [
          { title: 'Sinergia GMP+IMP en Proteínas Marinas', facts: ['Glutamato parmesano 1200mg.', 'Sinergia Umami x8.', 'Sake junmai daiginjo.'] },
          { title: 'Hidrocarburos y Compuestos Aromáticos', facts: ['Trufa+Jerez (pirazinas).', 'FlavorDB database.', 'Brut Nature 0-3g/L.'] }
        ]
      },
      {
        title: 'Diseño de Experiencias y Sommeliería',
        lessons: [
          { title: 'Arquitectura del Menú Degustación', facts: ['8-14 pases progresivos.', 'Ácido limpia paladar graso.', 'Salinidad controlada.'] },
          { title: 'Oxigenación y Dinámica de Copas', facts: ['Copa Borgoña (aromas).', 'Oxígeno suaviza taninos.', 'Champagne 6-8°C.'] }
        ]
      }
    ]
  }
];

async function callOllama(prompt) {
  const strictSystemPrompt = `Eres un experto chef científico. RESPONDE ÚNICAMENTE CON CONTENIDO TÉCNICO EN MARKDOWN.
PROHIBIDO USAR FRASES DE RELLENO COMO: "Aquí tienes", "Este texto ha sido generado", "Espero que te sirva", "En conclusión".
PROHIBIDO HACER INTRODUCCIONES O RESÚMENES. VE DIRECTO A LOS DATOS.`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, 
          prompt: `${strictSystemPrompt}\n\nREDACTA ESTA LECCIÓN:\n${prompt}`, 
          stream: false,
          options: { temperature: 0.1, top_p: 0.9, num_predict: 2048 }
        })
      });
      const body = await res.json();
      let text = (body.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      // Eliminar posibles comentarios al final que el modelo suele añadir
      text = text.replace(/Este texto ha sido generado.*/gi, '');
      text = text.replace(/Espero que esta lección.*/gi, '');
      if (text.length > 50) return text;
    } catch (e) {}
    await delay(3000);
  }
  return null;
}

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  AURA GASTRONOMY — Ultra Professional Reset v1      ');
  console.log('══════════════════════════════════════════════════════\n');

  console.log('🗑  Purgando base de datos académica (CLEAN SWEEP)…');
  await aDb.from('exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await aDb.from('lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await aDb.from('modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await aDb.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Purga completada.\n');

  for (const bp of COURSES) {
    console.log(`📚 [${bp.tier}] — "${bp.title}"`);
    
    // Create course
    const { data: courseRow, error } = await aDb.from('courses').insert({
      title: bp.title, description: bp.description, tier: bp.tier,
      course_order: bp.order, status: 'published', is_premium: bp.tier !== 'FREE',
      level: bp.tier === 'PRO' ? 'Chef' : 'Chef Elite'
    }).select().single();
    if (error) { console.error('  ❌ Error:', error.message); continue; }
    console.log(`  ✓ Curso creado: ${courseRow.id}`);

    // Create Modules & Lessons
    for (let mi = 0; mi < bp.modules.length; mi++) {
      const mod = bp.modules[mi];
      process.stdout.write(`    📖 Módulo ${mi+1}/3: "${mod.title}" … `);
      const { data: modRow, error: mErr } = await aDb.from('modules').insert({ course_id: courseRow.id, title: mod.title, order_index: mi+1 }).select().single();
      if (mErr) { console.log('❌'); continue; } else console.log('✓');

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        process.stdout.write(`      📝 Lección ${li+1}/2 … `);
        const prompt = `Lección: "${lesson.title}". Hechos Técnicos: ${lesson.facts.join('; ')}. Estilo Profesional, preciso, sin paja.`;
        const content = await callOllama(prompt) || `## ${lesson.title}\n\n${lesson.facts.map(f => `- ${f}`).join('\n')}`;
        await aDb.from('lessons').insert({ module_id: modRow.id, title: lesson.title, content, order_index: li+1 });
        console.log('✓');
        await delay(200);
      }
    }
    console.log('');
  }

  console.log('══════════════════════════════════════════════════════');
  console.log('  ✅ ACADEMIA RESTAURADA (ULTRA PRO)                ');
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
