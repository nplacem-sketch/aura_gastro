/**
 * seed_academy_final.js — AURA GASTRONOMY (Surgical Finalization)
 * ─────────────────────────────────────────────────────────────────────────────
 * RESUME & PATCH STRATEGY:
 *   1. NO Nuke (Preserve existing data)
 *   2. Find PRO Course -> Inject 25-question Exam (Chunked 5x5)
 *   3. Create PREMIUM-1/2 if missing -> Full Content + 25-question Exam
 *   4. SKIP Recipe Ingredients (Already handled)
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

// COURSES DEFINITION (Copy of v3)
const COURSES = [
  {
    tier: 'PRO',
    title: 'Técnicas Culinarias de Precisión: Ciencia y Método',
    description: 'Domina los fundamentos físico-químicos de la cocina profesional: termodinámica, emulsiones y fermentaciones controladas.',
    order: 1,
    prerequisite_index: null,
    modules: [
      {
        title: 'Termodinámica Aplicada a la Cocina',
        lessons: [
          { title: 'Conducción, convección y radiación en cocción', facts: ['La conducción transfiere calor por contacto directo entre moléculas; el acero inoxidable conduce ~16 W/m·K vs el cobre ~385 W/m·K.', 'La convección forzada (ventilador en hornos combi) acelera la transferencia de calor hasta un 30%.', 'La radiación infrarroja penetra 2-3 mm en la superficie.', 'El efecto Maillard comienza a ~140°C.', 'En cocción al vapor a 100°C la transferencia de calor es 4× más eficiente.'] },
          { title: 'Temperatura interna y desnaturalización de proteínas', facts: ['La miosina en carne bovina comienza a desnaturalizarse a 50°C; la actina, a 65-70°C.', 'El colágeno se convierte en gelatina a partir de 71°C.', 'El músculo de pescado desnaturaliza rápido: merluza óptima a 52-55°C.', 'La yema de huevo cuaja entre 63-65°C.', 'Uso de termómetro de sonda obligatorio.'] },
          { title: 'Sous-vide: parámetros de tiempo, temperatura y seguridad', facts: ['Rango 50-85°C con tolerancia ±0.1°C.', 'Reducción de 6 log10 de Listeria monocytogenes: 60°C durante 27.5 min.', 'Vacío ≥99.9%.', 'Bolsas de cocción certificadas PE o PA/PE.', 'Tiempo de estabilización: 1.5 h para 3 cm a 57°C.'] }
        ]
      },
      {
        title: 'Química de Emulsiones y Salsas Madres',
        lessons: [
          { title: 'Emulsionantes naturales: lecitina, caseína y yema', facts: ['Lecitina de soja contiene fosfatidilcolina.', 'Yema tiene ~10% lecitinas; soporta 7:1 aceite/yema.', 'Caseína se desestabiliza a pH < 4.6 (punto isoeléctrico).', 'Pasteurización yema: 60°C durante 3.5 min.', 'Mono y diglicéridos (E471) HLB 3-6 emulsiones A/O.'] },
          { title: 'Estabilidad y rotura controlada de emulsiones O/W y W/O', facts: ['Emulsión O/W: mayonesa, holandesa.', 'Emulsión W/O: mantequilla.', 'Rescatar holandesa cortada: 1 cda agua fría y batir fuera del fuego.', 'Tamaño óptimo glóbulo: 0.1-1 µm.', 'Goma xantana (0.1-0.3%) aumenta viscosidad.'] },
          { title: 'Salsas madre: base científica y proporciones exactas', facts: ['Veloutée: ratio 1:1 roux (60g mantequilla/60g harina).', 'Béchamel: nappe a 70°C indica viscosidad correcta.', 'Espanyola usa huesos tostados a 180°C.', 'Demi-glace contiene ≥15% proteínas gelatinosas.', 'Beurre blanc temperatura servicio max 65°C.'] }
        ]
      },
      {
        title: 'Fermentación Controlada en Cocina',
        lessons: [
          { title: 'Bacterias lácticas y fermentación espontánea', facts: ['Lactobacillus plantarum producen ácido láctico.', 'pH objetivo en encurtidos: 3.5-4.0.', 'Temperatura óptima: 25-30°C.', 'NaCl 2% inhibe mohos y Gram negativas.', 'Descenso de pH medido con pHmetro portátil.'] },
          { title: 'Control de pH y salinidad en encurtidos profesionales', facts: ['Salmuera estándar: 2-3% NaCl sobre vegetal.', 'Medición con refractómetro salino (2% sal = 2°Bé).', '72 h fermentación a 25°C = pH 4.0-4.5.', 'Kimchi fermentado a 4°C durante 2-4 semanas.', 'Uso de agua destilada (libre de cloro).'] },
          { title: 'Koji, miso y garum: fermentación de proteínas en alta cocina', facts: ['Koji (Aspergillus oryzae) incubación 28-32°C.', 'Miso blanco (shiro): 5-8% sal / Miso rojo: 10-12% sal.', 'Garum moderno (Noma): koji 15% + 12% sal a 60°C.', 'Nam pla fermentado 12-18 meses.', 'MSG natural en miso: 0.5-1.5 g/100g.'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Cocina Molecular: Del Laboratorio al Plato de Alta Cocina',
    description: 'Programa de vanguardia basado en hidrocoloides, esferificación y criotecnia.',
    order: 2,
    prerequisite_index: null,
    modules: [
      {
        title: 'Hidrocoloides: Gelificantes y Espesantes de Precisión',
        lessons: [
          { title: 'Agar-agar: gelificación termorreversible', facts: ['Punto gelificación: 32-40°C. Fusión: 85-95°C.', 'Concentraciones: suave 0.5%, firme 1%.', 'Gelatiniza en caliente → líquido; sólido a >40°C.', 'Espaguetis agar: gel 0.7% en aceite frío (-20°C).', 'Inhibido por papaína (usar fruta cocinada).'] },
          { title: 'Carragenanos: tipos y diferencias funcionales', facts: ['Kappa (κ): gel firme, frágil con K⁺.', 'Iota (ι): gel elástico con Ca²⁺.', 'Lambda (λ): espesante en frío (no gelifica).', 'Activación ≥70°C; gelifica 30-60°C.', 'Panna cotta iota 0.6% = gel estable a 55°C.'] },
          { title: 'Metilcelulosa, xantana y goma guar: espesantes', facts: ['Metilcelulosa (MC) cuaja en caliente (>50°C).', 'Xantana (E415) estable entre -18°C y 120°C.', 'Guar (E412) potencia 5× viscosidad xantana.', 'Guar+Xantana (1:1) produce sinergismo.', 'Ratio LBG+Kappa 60:40 para evitar sinéresis.'] }
        ]
      },
      {
        title: 'Esferificación: Básica, Inversa y Aplicaciones',
        lessons: [
          { title: 'Esferificación básica: Na-alginato + CaCl₂', facts: ['Na-alginato (E401) reacciona con Ca²⁺.', 'Concentración: 0.5% alginato + 0.5% CaCl₂.', 'Hidratar alginato 30 min (turmix) o 12 h.', 'Gelificación: 1-2 min caviar; 3-4 min ravioli.', 'Incompatible con pH < 4.'] },
          { title: 'Esferificación inversa: Cal-Gluconolactato + Alginato', facts: ['Ca²⁺ dentro (GDL 1-2%); alginato fuera (0.5%).', 'Membrana no sigue gelificando (estable horas).', 'GDL neutro de sabor y soluble en frío.', 'Permite esferar lácteos y alcoholes.', 'Aceite oliva (lecitina 0.5%) inversa = El Bulli.'] },
          { title: 'Raviolis líquidos y caviar vegetal', facts: ['Ravioli líquido: cuchara 5ml en CaCl₂ 60s.', 'Caviar vegetal: jeringa caída libre desde 10cm.', 'Grosor membrana básica: 0.3-0.5 mm.', 'Enjuague con agua destilada obligatorio.', 'Vida útil inversas: 24-48 h estables.'] }
        ]
      },
      {
        title: 'Nitrógeno Líquido y Criotecnia en Restauración',
        lessons: [
          { title: 'Propiedades físicas del N₂ líquido', facts: ['Temp ebullición -195.8°C.', '1L líquido = 696L gas.', 'Dewares acero inoxidable al vacío.', 'Equipamiento: guantes, gafas, mandil.', 'Efecto Leidenfrost: capa gaseosa aislante.'] },
          { title: 'Helados instantáneos y polvos criogénicos', facts: ['Cristales < 5 µm = textura ultracremosa.', 'Base: nata 35% MG + azúcar + yemas.', 'Maltodextrina de tapioca para polvos (1:1).', 'Popping candy atrapa CO₂ en N₂l.', 'Sorbetes express: 200ml zumo / 300ml N₂l.'] },
          { title: 'Protocolos de seguridad criogénica', facts: ['Concentración O₂ mínima 19.5% (alarma).', 'No almacenar en cámaras frigoríficas cerradas.', 'Quemaduras: agua tibia (37-40°C) 10-20 min.', 'Real Decreto 374/2001 (España).', 'Transporte: no colocar dewar en cabina.'] }
        ]
      }
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Sumillería Avanzada y Maridaje Científico',
    description: 'Análisis organoléptico de vinos, sake y destilados con base química y food pairing molecular.',
    order: 3,
    prerequisite_index: 1,
    modules: [
      {
        title: 'Química Sensorial del Vino',
        lessons: [
          { title: 'Polifenoles, taninos y antocianos', facts: ['Taninos condensados (proantocianidinas).', 'Antocianos rojos pH < 3.5.', 'IPT tintos: 40 (jóvenes) a >120 (reservas).', 'Taninos de semilla son más astringentes.', 'Servicio tinto >18°C potencia percepción alcohol.'] },
          { title: 'Ésteres, alcoholes superiores y terpenos', facts: ['Acetato isoamilo: plátano (umbral 0.03 mg/L).', 'Acetato etilo: pegamento (defecto >150 mg/L).', 'Linalol en Albariño: 1-5 mg/L.', 'β-damascenona: aroma rosa (umbral 0.009 µg/L).', 'Alcoholes superiores contribuyen al cuerpo.'] },
          { title: 'pH, acidez total y volátil', facts: ['pH tintos: 3.3-3.7. Afecta efectividad SO₂.', 'Acidez total (ATT): 5-7 g/L (tintos).', 'Fermentación maloláctica por Oenococcus oeni.', 'Límite legal acidez volátil tintos: 1.2 g/L.', 'Herramienta: tira pH o pHmetro portátil.'] }
        ]
      },
      {
        title: 'Food Pairing Molecular y Maridaje',
        lessons: [
          { title: 'Teoría del food pairing molecular', facts: ['Hipótesis Blumenthal/Gerbaulet (2002).', 'Chocolate y coliflor comparten pirazinas.', 'FlavorDB (IIT Delhi) contiene >1000 ingredientes.', 'No considera estructura (acidez/textura).', 'Trufa (bismetiltiometano) marida con jerez.'] },
          { title: 'Umami, proteínas marinas y sake', facts: ['Glutamato parmesano 1200 mg/100g.', 'Sinergia Glutamato (GMP) + Inosinato (IMP) x8.', 'Chablis marida con ostras (maloláctica).', 'Sake junmai daiginjo pulido 50%.', 'CO₂ espumosos forma ácido carbónico (pH 4.2).'] },
          { title: 'Espumosos, sake premium y destilados', facts: ['Brut Nature (0-3 g/L azúcar).', 'Single Malt Speyside: manzana y avena.', 'Islay Scotch fenol 40-120 ppm.', 'Mezcal espadín: terroso y ácido.', 'Calvados AOP Pays d\'Auge (sidra 2 años).'] }
        ]
      },
      {
        title: 'Diseño de Menús Degustación',
        lessons: [
          { title: 'Progresión de sabores: arquitectura del menú', facts: ['Arquitectura clásica 8-14 pases.', 'Progresión fríos → calientes → fríos.', 'Pase ácido limpia paladar rico en grasa.', 'Salinidad progresiva para evitar fatiga sensorial.', '>18 pases provoca pérdida de impacto.'] },
          { title: 'Temperatura de servicio y oxigenación', facts: ['Champagne 6-8°C / Tempranillo 16-17°C.', 'Decantar tintos jóvenes (Syrah, Nebbiolo).', 'Oxígeno suaviza taninos por polimerización.', 'Copa Borgoña (750ml) concentra aromas.', 'Temperatura copa: no enjuagar con agua caliente.'] },
          { title: 'Cócteles de autor y destilados de barrica', facts: ['Negroni (24 ppm quinina) marida con foie.', 'Martini Wasabi / Nigiri Salmón belly.', 'Bourbon + Bitters chocolate / Canelón mole.', 'Brandy Jerez VORS (>30 años).', 'Digestivo: Angostura estimula bilis.'] }
        ]
      }
    ]
  }
];

// OLLAMA CALL (Enhanced Retry)
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
    } catch (e) {
      console.log(`\n    [Ollama retry ${attempt}/5] ${e.message}`);
    }
    await delay(10000); // 10s wait for 7b model
  }
  return null;
}

// SURGICAL INJECTION
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  AURA GASTRONOMY — Surgical Academy Finalizer       ');
  console.log('══════════════════════════════════════════════════════\n');

  const insertedIds = [];

  for (let ci = 0; ci < COURSES.length; ci++) {
    const bp = COURSES[ci];
    const prereqId = bp.prerequisite_index !== null ? (insertedIds[bp.prerequisite_index] || null) : null;

    console.log(`📚 [${ci + 1}/${COURSES.length}] ${bp.tier} — "${bp.title}"`);

    // Check if course exists
    let courseRow;
    const { data: existingCourse } = await aDb.from('courses').select('id').eq('title', bp.title).limit(1).single();
    
    if (existingCourse) {
      console.log(`  ✓ Curso ya existe: ${existingCourse.id}. Saltando creación de estructura.`);
      courseRow = existingCourse;
    } else {
      // Create course
      const { data, error } = await aDb.from('courses').insert({
        title: bp.title, description: bp.description, tier: bp.tier,
        course_order: bp.order, status: 'published', is_premium: bp.tier !== 'FREE',
        level: bp.tier === 'PRO' ? 'Avanzado' : 'Experto'
      }).select().single();
      if (error) { console.error('  ❌ Error:', error.message); insertedIds.push(null); continue; }
      courseRow = data;
      console.log(`  ✓ Curso creado: ${courseRow.id}`);

      // Create Modules & Lessons
      for (let mi = 0; mi < bp.modules.length; mi++) {
        const mod = bp.modules[mi];
        process.stdout.write(`    📖 Módulo ${mi + 1}: "${mod.title}" … `);
        const { data: modRow, error: mErr } = await aDb.from('modules').insert({ course_id: courseRow.id, title: mod.title, order_index: mi + 1 }).select().single();
        if (mErr) { console.log('❌'); continue; } else console.log('✓');

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          process.stdout.write(`      📝 Lección ${li + 1} … `);
          const prompt = `Redacta contenido técnico breve (200 promtp) para la lección "${lesson.title}" basado en: ${lesson.facts.join('; ')}. Directo al grano.`;
          const content = await callOllama(prompt) || `## ${lesson.title}\n\n${lesson.facts.map(f => `- ${f}`).join('\n')}`;
          await aDb.from('lessons').insert({ module_id: modRow.id, title: lesson.title, content, order_index: li + 1 });
          console.log('✓');
          await delay(200);
        }
      }
    }
    insertedIds.push(courseRow.id);

    // EXAM GENERATION (25 questions, 5x5 batches)
    const { data: existingExam } = await aDb.from('exams').select('id, questions').eq('course_id', courseRow.id).maybeSingle();
    if (existingExam && existingExam.questions?.length >= 25) {
      console.log(`  ✓ Examen ya tiene ${existingExam.questions.length} preguntas. Saltando.`);
    } else {
      console.log(`  🎓 Generando examen (25 preguntas)...`);
      const allFacts = bp.modules.flatMap(m => m.lessons.flatMap(l => l.facts));
      let questions = [];

      for (let batch = 1; batch <= 5; batch++) {
        process.stdout.write(`    [Lote ${batch}/5] … `);
        const batchFacts = allFacts.slice((batch - 1) * 3, batch * 3 + 2);
        const examPrompt = `Genera EXACTAMENTE 5 preguntas técnicas MCQs (JSON Array) basadas en: ${batchFacts.join('\n')}. Objeto: {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..."}. SOLO JSON.`;

        let batchSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const raw = await callOllama(examPrompt);
          try {
            if (raw) {
              const cleaned = raw.replace(/```json|```/g, '').trim();
              const bQ = JSON.parse(cleaned);
              if (Array.isArray(bQ)) { questions.push(...bQ.slice(0, 5)); batchSuccess = true; break; }
            }
          } catch(e) {}
          await delay(2000);
        }
        process.stdout.write(batchSuccess ? '✓ ' : '❌ ');
      }

      if (questions.length > 0) {
        if (existingExam) {
          await aDb.from('exams').update({ questions: questions.slice(0, 25) }).eq('id', existingExam.id);
        } else {
          await aDb.from('exams').insert({ course_id: courseRow.id, questions: questions.slice(0, 25) });
        }
        console.log(`\n    ✓ Examen finalizado con ${questions.length} preguntas.`);
      }
    }
    console.log('');
  }

  console.log('══════════════════════════════════════════════════════');
  console.log('  ✅ ACADEMIA FINALIZADA CON ÉXITO                  ');
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
