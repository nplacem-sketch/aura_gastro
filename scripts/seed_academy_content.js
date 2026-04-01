/**
 * seed_academy_content.js — AURA GASTRONOMY (Content & Placeholder Exam)
 * ─────────────────────────────────────────────────────────────────────────────
 * GOAL: Regenerate PRO and PREMIUM courses fully (3 modules, 9 lessons each).
 *       Inyectar el marcador "PRÓXIMAMENTE EXÁMEN" en cada curso.
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
    title: 'Técnicas Culinarias de Precisión: Ciencia y Método',
    description: 'Domina los fundamentos físico-químicos de la cocina profesional: termodinámica, emulsiones y fermentaciones controladas.',
    order: 1,
    modules: [
      {
        title: 'Termodinámica Aplicada a la Cocina',
        lessons: [
          { title: 'Conducción, convección y radiación en cocción', facts: ['La conducción transfiere calor por contacto directo; cobre ~385 W/m·K.', 'Convección forzada aumenta eficiencia ~30%.', 'Efecto Maillard a ~140°C.'] },
          { title: 'Temperatura interna y desnaturalización de proteínas', facts: ['Miosina 50°C, Actina 65-70°C.', 'Colágeno a gelatina a 71°C.', 'Termómetro de sonda es crítico.'] },
          { title: 'Sous-vide: parámetros de tiempo, temperatura y seguridad', facts: ['Rango 50-85°C.', '6-log reduction Listeria: 60°C/27.5min.', 'Vacío ≥99.9%.'] }
        ]
      },
      {
        title: 'Química de Emulsiones y Salsas Madres',
        lessons: [
          { title: 'Emulsionantes naturales: lecitina, caseína y yema', facts: ['Lecitina en yema (~10%).', 'Caseína desestabiliza pH < 4.6.', 'E471 emulsiones A/O.'] },
          { title: 'Estabilidad y rotura controlada de emulsiones O/W y W/O', facts: ['O/W: mayonesa. W/O: mantequilla.', 'Xantana (0.1-0.3%) viscosidad.', 'Rescate con agua fría.'] },
          { title: 'Salsas madre: base científica y proporciones exactas', facts: ['Veloutée 1:1 roux.', 'Béchamel nappe 70°C.', 'Demi-glace ≥15% gelatina.'] }
        ]
      },
      {
        title: 'Fermentación Controlada en Cocina',
        lessons: [
          { title: 'Bacterias lácticas y fermentación espontánea', facts: ['Lactobacillus plantarum.', 'pH objetivo 3.5-4.0.', 'NaCl 2% inhibición patógenos.'] },
          { title: 'Control de pH y salinidad en encurtidos profesionales', facts: ['Salmuera 2-3%.', 'Refractómetro salino.', 'Kimchi 4°C/2 semanas.'] },
          { title: 'Koji, miso y garum: fermentación de proteínas en alta cocina', facts: ['Koji Aspergillus oryzae 28-32°C.', 'Garum moderno (60°C/koji).', 'MSG natural en miso.'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Cocina Molecular: Del Laboratorio al Plato de Alta Cocina',
    description: 'Programa de vanguardia basado en hidrocoloides, esferificación y criotecnia.',
    order: 2,
    modules: [
      {
        title: 'Hidrocoloides: Gelificantes y Espesantes de Precisión',
        lessons: [
          { title: 'Agar-agar: gelificación termorreversible', facts: ['Fusión 85-95°C, Gel 32-40°C.', '0.5% suave, 1% firme.', 'Espaguetis agar.'] },
          { title: 'Carragenanos: tipos y diferencias funcionales', facts: ['Kappa (firme), Iota (elástico).', 'Activación ≥70°C.', 'Panna cotta iota (0.6%).'] },
          { title: 'Metilcelulosa, xantana y goma guar: espesantes', facts: ['Metilcelulosa cuaja >50°C.', 'Xantana estable -18 a 120°C.', 'Sinergia Guar+Xantana (1:1).'] }
        ]
      },
      {
        title: 'Esferificación: Básica, Inversa y Aplicaciones',
        lessons: [
          { title: 'Esferificación básica: Na-alginato + CaCl₂', facts: ['0.5% alginato + 0.5% CaCl₂.', 'Hidratación 12h.', 'Incompatible pH < 4.'] },
          { title: 'Esferificación inversa: Cal-Gluconolactato + Alginato', facts: ['Ca²⁺ dentro, alginato fuera.', 'Membrana no sigue gelificando (estable horas).', 'GDL neutro.'] },
          { title: 'Raviolis líquidos y caviar vegetal', facts: ['Ravioli 5ml en CaCl₂.', 'Caviar caída libre 10cm.', 'Enjuague agua destilada.'] }
        ]
      },
      {
        title: 'Nitrógeno Líquido y Criotecnia en Restauración',
        lessons: [
          { title: 'Propiedades físicas del N₂ líquido', facts: ['-195.8°C.', '1L liq = 696L gas.', 'Dewar vacío acero.'] },
          { title: 'Helados instantáneos y polvos criogénicos', facts: ['Cristales < 5µm.', 'Maltodextrina tapioca (1:1).', 'Efecto Leidenfrost.'] },
          { title: 'Protocolos de seguridad criogénica', facts: ['O₂ min 19.5%.', 'RD 374/2001.', 'Quemaduras: agua tibia 37°C.'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Sumillería Avanzada y Maridaje Científico',
    description: 'Análisis organoléptico de vinos, sake y destilados con base química y food pairing molecular.',
    order: 3,
    modules: [
      {
        title: 'Química Sensorial del Vino',
        lessons: [
          { title: 'Polifenoles, taninos y antocianos', facts: ['Antocianos rojos pH < 3.5.', 'IPT tintos 40-120.', 'Taninos semilla astringentes.'] },
          { title: 'Ésteres, alcoholes superiores y terpenos', facts: ['Acetato isoamilo: plátano.', 'Linalol en Albariño.', 'β-damascenona: rosa.'] },
          { title: 'pH, acidez total y volátil', facts: ['pH tintos 3.3-3.7.', 'ATT 5-7 g/L.', 'Límite legal volátil 1.2 g/L.'] }
        ]
      },
      {
        title: 'Food Pairing Molecular y Maridaje',
        lessons: [
          { title: 'Teoría del food pairing molecular', facts: ['Chocolate+coliflor (pirazinas).', 'FlavorDB database.', 'Trufa+Jerez.'] },
          { title: 'Umami, proteínas marinas y sake', facts: ['Glutamato parmesano 1200mg.', 'Sinergia GMP+IMP.', 'Sake junmai daiginjo 50%.'] },
          { title: 'Espumosos, sake premium y destilados', facts: ['Brut Nature 0-3g/L azúcar.', 'Islay Scotch fenol 40-120 ppm.', 'Calvados AOP.'] }
        ]
      },
      {
        title: 'Diseño de Menús Degustación',
        lessons: [
          { title: 'Progresión de sabores: arquitectura del menú', facts: ['Arquitectura 8-14 pases.', 'Ácido limpia paladar graso.', 'Salinidad progresiva.'] },
          { title: 'Temperatura de servicio y oxigenación', facts: ['Champagne 6-8°C.', 'Decantar tintos jóvenes.', 'Copa Borgoña (aromas).'] },
          { title: 'Cócteles de autor y destilados de barrica', facts: ['Martini Wasabi/Salmón.', 'Negroni/Foie.', 'Brandy Jerez VORS.'] }
        ]
      }
    ]
  }
];

async function callOllama(prompt) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, prompt, stream: false,
          options: { temperature: 0.1, top_p: 0.9, num_predict: 2048 }
        })
      });
      const body = await res.json();
      let text = (body.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (text.length > 50) return text;
    } catch (e) {}
    await delay(3000);
  }
  return null;
}

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  AURA GASTRONOMY — Content with Placeholder Exams   ');
  console.log('══════════════════════════════════════════════════════\n');

  for (const bp of COURSES) {
    console.log(`📚 [${bp.tier}] — "${bp.title}"`);
    
    // Cleanup TARGET course only
    const { data: existing } = await aDb.from('courses').select('id').eq('title', bp.title).limit(1).single();
    if (existing) {
      console.log(`  🗑 Borrando antiguos (${existing.id})…`);
      await aDb.from('courses').delete().eq('id', existing.id);
    }

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
        process.stdout.write(`      📝 Lección ${li+1}/3 … `);
        const prompt = `Redacta el contenido profesional para "${lesson.title}" basado en: ${lesson.facts.join('; ')}. Estilo Chef Elite.`;
        const content = await callOllama(prompt) || `## ${lesson.title}\n\n${lesson.facts.map(f => `- ${f}`).join('\n')}`;
        await aDb.from('lessons').insert({ module_id: modRow.id, title: lesson.title, content, order_index: li+1 });
        console.log('✓');
        await delay(200);
      }
    }

    // Insert Placeholder Exam
    console.log(`  🎓 Inyectando marcador: "PRÓXIMAMENTE EXÁMEN"…`);
    await aDb.from('exams').insert({
      course_id: courseRow.id,
      questions: [
        {
          question: "PRÓXIMAMENTE EXÁMEN",
          options: ["Contenido en preparación", "Volver al campus", "Entendido", "Notificarme"],
          answer: 2,
          explanation: "Este examen está siendo validado por el comité académico de AURA GASTRONOMY."
        }
      ]
    });
    console.log('  ✓ Marcador listo.\n');
  }

  console.log('══════════════════════════════════════════════════════');
  console.log('  ✅ CONTENIDOS Y MARCADORES LISTOS                ');
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
