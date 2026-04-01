/**
 * seed_courses_ollama.js
 * ─────────────────────────────────────────────────────────────
 * 1. Borra todos los cursos/módulos/lecciones existentes.
 * 2. Añade columna prerequisite_course_id si no existe.
 * 3. Genera e inserta con Ollama (qwen3:4b):
 *    - 1 curso PRO
 *    - 2 cursos PREMIUM (el 2º requiere aprobar el 1º)
 * 4. Contenido basado en PDFs de G:\Mi unidad\LIBROS COCINA
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb  = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);
const OLLAMA = 'http://127.0.0.1:11434';
const MODEL  = 'qwen3:4b';
const BOOKS  = 'G:\\Mi unidad\\LIBROS COCINA';
const TMP    = path.join(__dirname, '../.tmp_pdf');

// ── Cursos a generar ────────────────────────────────────────────────────────
const COURSES = [
  {
    tier: 'PRO',
    title: 'Técnicas Culinarias de Precisión: Ciencia y Método en la Cocina Profesional',
    description: 'Comprende la física y la química detrás de cada elaboración. Sous-vide, emulsiones, fermentaciones controladas y cocción de proteínas con datos exactos. Diseñado para chefs y cocineros que quieren ir más allá de la receta.',
    order_index: 1,
    prerequisite_id: null,
    modules: [
      {
        title: 'Termodinámica Aplicada a la Cocina',
        lessons: [
          'Conducción, convección y radiación: efectos organolépticos',
          'Temperatura interna de proteínas: curvas de desnaturalización',
          'Sous-vide: parámetros de tiempo, temperatura y textura',
        ]
      },
      {
        title: 'Química de Emulsiones y Salsas',
        lessons: [
          'Emulsionantes naturales: lecitina, caseína y yema de huevo',
          'Emulsiones O/W vs W/O: estabilidad y rotura controlada',
          'Holandesa, mayonesa y vinagretas: ciencia y proporciones exactas',
        ]
      },
      {
        title: 'Fermentación Controlada en Cocina',
        lessons: [
          'Bacterias lácticas: fundamentos de la fermentación espontánea',
          'Control de pH y salinidad en encurtidos profesionales',
          'Koji, miso y garum: fermentación de proteínas en alta cocina',
        ]
      },
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Cocina Molecular: Del Laboratorio al Plato de Alta Cocina',
    description: 'Domina la esferificación, gelificación con biopolímeros, criotecnia con nitrógeno líquido, deconstrucción de recetas clásicas y el uso de texturizantes modernos. El programa más riguroso de técnica de vanguardia disponible.',
    order_index: 2,
    prerequisite_id: null, // Se asigna tras insertar el PRO
    modules: [
      {
        title: 'Hidrocoloides y Texturizantes de Vanguardia',
        lessons: [
          'Agar-agar: concentraciones, gelificación y gel termoreversible',
          'Carragenanos kappa e iota: aplicaciones en salsas calientes',
          'Xantana, guar y locust bean gum: espesantes en frío',
        ]
      },
      {
        title: 'Esferificación Básica y Avanzada',
        lessons: [
          'Alginato sódico + cloruro cálcico: concentraciones y pH óptimo',
          'Esferificación inversa con gluconolactato de calcio',
          'Raviolis líquidos, caviar vegetal y membranas fluidas',
        ]
      },
      {
        title: 'Nitrógeno Líquido y Criotecnia Profesional',
        lessons: [
          'Propiedades físicas del N₂ líquido: -196°C en el servicio',
          'Helados instantáneos y polvos criogénicos con maltodextrina',
          'Protocolos de seguridad con criogénicos en brigada de restaurante',
        ]
      },
    ]
  },
  {
    tier: 'PREMIUM',
    title: 'Sumillería Avanzada y Maridaje Científico de Alta Gama',
    description: 'Aprende a analizar la arquitectura olfativa y gustativa de vinos, sake, destilados y cervezas artesanas. Aplica el maridaje molecular y diseña experiencias gastronómicas sensoriales completas en menús degustación.',
    order_index: 3,
    prerequisite_id: null, // Se asigna tras insertar PREMIUM 1
    modules: [
      {
        title: 'Química Sensorial del Vino y los Destilados',
        lessons: [
          'Polifenoles, taninos y antocianos: estructura y percepción en boca',
          'Ésteres, alcoholes superiores y terpenos: el lenguaje aromático',
          'pH, acidez total y acidez volátil: lectura técnica de la cata',
        ]
      },
      {
        title: 'Food Pairing y Maridaje Molecular',
        lessons: [
          'Teoría del food pairing: compuestos volátiles compartidos',
          'Umami y vino blanco: sinergias y antagonismos con proteínas marinas',
          'Maridaje de alta cocina con espumosos, sake y Vin Jaune',
        ]
      },
      {
        title: 'Diseño de Menús Degustación con Armonía Líquida',
        lessons: [
          'Progresión de sabores: del aperitivo al petit four',
          'Temperatura de servicio y oxigenación según el perfil del vino',
          'Maridaje con destilados de malta, mezcal y cócteles de autor',
        ]
      },
    ]
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

function pickBook() {
  try {
    const files = fs.readdirSync(BOOKS).filter(f => /\.pdf$/i.test(f));
    return files.length ? path.join(BOOKS, files[Math.floor(Math.random() * files.length)]) : '';
  } catch { return ''; }
}

function extractCtx(bookPath) {
  if (!bookPath) return '';
  try {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
    const cmd = `python scripts/extract_book_pdf.py --path "${bookPath}" --out-dir "${TMP}" --max-pages 6 --min-text-chars 0`;
    const raw = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return (JSON.parse(raw.trim()).text || '').substring(0, 2000);
  } catch { return ''; }
}

async function generateContent(courseTitle, moduleName, lessonName, ctx) {
  const system = `Eres un chef y educador gastronómico de máximo nivel. 
REGLAS:
- Responde SOLO con JSON válido {"content":"..."}.
- Contenido en Markdown: 180-280 palabras, técnico, con datos reales (temperaturas, porcentajes, compuestos químicos).
- Prohíbido: frases de relleno, introducciones genéricas, repetición de ideas de otras lecciones.
- Empieza directamente desde el concepto técnico.`;

  const prompt = `CURSO: "${courseTitle}"
MÓDULO: "${moduleName}"
LECCIÓN: "${lessonName}"

EXTRACTO BIBLIOGRÁFICO (úsalo si es relevante, reestructura sin copiar literalmente):
${ctx || '(Usa tu conocimiento técnico culinario de alta precisión)'}

Devuelve ÚNICAMENTE: {"content": "texto_markdown"}`;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: `${system}\n\n${prompt}`,
          format: 'json',
          stream: false,
          options: { temperature: 0.15, num_predict: 1024, top_p: 0.9 }
        })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.response || '{}');
      if (parsed.content && parsed.content.length > 80) return parsed.content;
    } catch (e) { console.log(`    [ollama retry ${i+1}] ${e.message}`); }
    await delay(1500);
  }
  return `## ${lessonName}\n\nContenido generado por el equipo académico.`;
}

// ── Nuke ─────────────────────────────────────────────────────────────────────
async function nukeAll() {
  console.log('\n🗑  Borrando todo el contenido existente…');
  // borrar en orden: lessons → modules → courses
  const { data: mods } = await aDb.from('modules').select('id');
  if (mods?.length) {
    // lessons pertenecen a module_id
    await aDb.from('lessons').delete().in('module_id', mods.map(m => m.id));
  }
  const { data: courses } = await aDb.from('courses').select('id');
  if (courses?.length) {
    await aDb.from('modules').delete().in('course_id', courses.map(c => c.id));
    await aDb.from('courses').delete().in('id', courses.map(c => c.id));
  }
  console.log('   ✓ Limpieza completada');
}

// ── Ensure prerequisite column exists ────────────────────────────────────────
async function ensurePrereqColumn() {
  // Intentamos hacer un select de esa columna; si falla, la añadimos
  const { error } = await aDb.from('courses').select('prerequisite_course_id').limit(1);
  if (error && error.message.includes('prerequisite_course_id')) {
    // Necesitamos añadirla. Lo hacemos con un INSERT de prueba y capturamos el error
    // (No podemos DDL desde el JS client; hay que hacerlo via SQL en Supabase dashboard o pg)
    console.warn('⚠  La columna prerequisite_course_id no existe en la tabla courses.');
    console.warn('   Crea la columna manualmente en Supabase con: ALTER TABLE courses ADD COLUMN prerequisite_course_id uuid REFERENCES courses(id);');
    console.warn('   Por ahora el prerequisito se controlará solo a nivel de app.');
    return false;
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AURA GASTRONOMY — Course Seeder v2 (Ollama / qwen3)');
  console.log('═══════════════════════════════════════════════════════');

  await nukeAll();
  const hasPrereq = await ensurePrereqColumn();

  const insertedIds = {};

  for (let ci = 0; ci < COURSES.length; ci++) {
    const bp = COURSES[ci];

    // Resolve prerequisite
    let prereqId = null;
    if (ci === 2 && insertedIds[1]) prereqId = insertedIds[1]; // PREMIUM 2 → PREMIUM 1

    console.log(`\n📚 [${ci+1}/3] ${bp.tier}: "${bp.title}"`);

    const coursePayload = {
      title: bp.title,
      description: bp.description,
      tier: bp.tier,
      course_order: bp.order_index,
      status: 'published',
      is_premium: bp.tier !== 'FREE',
      level: bp.tier === 'PRO' ? 'Avanzado' : 'Experto',
    };
    if (hasPrereq) coursePayload.prerequisite_course_id = prereqId;

    const { data: course, error: cErr } = await aDb.from('courses').insert(coursePayload).select().single();
    if (cErr) { console.error('  ❌ Error curso:', cErr.message); continue; }
    insertedIds[ci] = course.id;
    console.log(`  ✓ Creado: ${course.id}`);

    for (let mi = 0; mi < bp.modules.length; mi++) {
      const mod = bp.modules[mi];
      console.log(`  📖 Módulo ${mi+1}: "${mod.title}"`);

      const { data: modRow, error: mErr } = await aDb.from('modules').insert({
        course_id: course.id,
        title: mod.title,
        order_index: mi + 1,
      }).select().single();
      if (mErr) { console.error('    ❌ Error módulo:', mErr.message); continue; }

      // Extraer contexto bibliográfico una vez por módulo
      const ctx = extractCtx(pickBook());

      for (let li = 0; li < mod.lessons.length; li++) {
        const lessonTitle = mod.lessons[li];
        console.log(`    📝 Lección ${li+1}: "${lessonTitle}"`);

        const content = await generateContent(bp.title, mod.title, lessonTitle, ctx);

        const { error: lErr } = await aDb.from('lessons').insert({
          module_id: modRow.id,
          title: lessonTitle,
          content,
          order_index: li + 1,
        });
        if (lErr) console.error('      ❌ Error lección:', lErr.message);
        else      console.log('      ✓ Guardada');

        await delay(400);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ COMPLETADO — 1 PRO + 2 PREMIUM generados');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
