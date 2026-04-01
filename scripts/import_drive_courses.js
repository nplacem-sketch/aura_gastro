'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const DEFAULT_FOLDER_URL = 'https://drive.google.com/drive/folders/1DfreIrZIuURapIRPUvQAs__VQHbuCUQp?usp=drive_link';
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const folderUrlIndex = argv.indexOf('--folder-url');
const folderUrl = folderUrlIndex >= 0 ? argv[folderUrlIndex + 1] : DEFAULT_FOLDER_URL;

const tmpRoot = path.resolve(process.cwd(), 'tmp', 'drive-course-import');
const downloadsDir = path.join(tmpRoot, 'downloads');
const extractDir = path.join(tmpRoot, 'extract');

for (const dir of [tmpRoot, downloadsDir, extractDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decodeHtml(html) {
  return String(html || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForSearch(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[#|`>*_]/g, ' ');
}

function countWords(text) {
  return cleanText(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimateDuration(text) {
  const minutes = Math.max(12, Math.round(countWords(text) / 140));
  return `${minutes} min`;
}

function safeFilename(name, id) {
  const stem = normalizeKey(name).replace(/\s+/g, '-');
  return `${stem || id}.pdf`;
}

function parseFolderEntries(html) {
  const decoded = decodeHtml(html);
  const regex = /\[\[null,"([^"]+)"\],null,null,null,"application\/pdf"[\s\S]{0,1800}?\[\[\["([^"]+?\.pdf)",null,true\]\]\]/g;
  const seen = new Set();
  const files = [];

  let match;
  while ((match = regex.exec(decoded))) {
    const id = match[1];
    const name = match[2];
    if (seen.has(id)) continue;
    seen.add(id);
    files.push({ id, name });
  }

  return files;
}

function sliceSection(text, startMarker, endMarker) {
  const source = cleanText(text);
  const searchableSource = normalizeForSearch(source);
  const normalizedStart = normalizeForSearch(startMarker);
  const normalizedEnd = endMarker ? normalizeForSearch(endMarker) : null;
  const startIndex = searchableSource.indexOf(normalizedStart);

  if (startIndex < 0) {
    throw new Error(`No se encontro el inicio de seccion: ${startMarker}`);
  }

  const endIndex = normalizedEnd ? searchableSource.indexOf(normalizedEnd, startIndex + normalizedStart.length) : source.length;
  if (endMarker && endIndex < 0) {
    throw new Error(`No se encontro el final de seccion: ${endMarker}`);
  }

  return source.slice(startIndex, endIndex >= 0 ? endIndex : source.length).trim();
}

function formatLessonContent(sectionText) {
  return cleanText(sectionText)
    .replace(/^##\s*Contexto\s+Contenido indexado y estructurado[\s\S]*?##\s*Desarrollo\s+/i, '')
    .replace(/^#{1,6}\s*.*requisitos de certificacion.*$/gim, '## Cierre de curso')
    .replace(/\n+\*\*Requisitos para la Certificacion Final:\*\*[\s\S]*$/i, '')
    .replace(/\n+##\s*Aplicacion\s+Trabaja esta unidad como un bloque operativo[\s\S]*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isClosureSection(module) {
  const signal = normalizeForSearch([module.title, module.lessonTitle, module.start].filter(Boolean).join('\n'));
  return signal.includes('requisitos de certificacion');
}

function resolveModuleTitle(module) {
  return isClosureSection(module) ? 'Cierre de curso' : module.title;
}

function resolveLessonTitle(module) {
  const baseTitle = module.lessonTitle || module.title;
  return isClosureSection(module) ? 'Cierre de curso' : baseTitle;
}

function buildClosureLessonContent(courseTitle) {
  return cleanText(`
## Cierre de curso

Este bloque final recoge el cierre editorial de "${courseTitle}" dentro del campus.

### Sintesis final

- Repasa las tecnicas, criterios y decisiones clave trabajadas durante el curso.
- Vuelve sobre las tablas, procesos y notas operativas que necesites afianzar.
- Usa este cierre como referencia para consolidar tu propia aplicacion profesional.

### Siguiente paso recomendado

Puedes continuar con cualquier otro curso del campus en el orden que mejor encaje con tu progreso.
`);
}

function stripHeadingPrefix(line) {
  return String(line || '').replace(/^#{1,6}\s+/, '').trim();
}

function deriveAutomaticModules(text) {
  const lines = cleanText(text).split('\n');
  const headings = [];

  for (const rawLine of lines) {
    const heading = stripHeadingPrefix(rawLine);
    if (!heading) continue;
    if (!/^\d+\.\s+/.test(heading)) continue;
    if (heading.includes('**')) continue;
    if (heading.length > 140) continue;

    const title = heading.replace(/^\d+\.\s+/, '').trim();
    const exists = headings.some((item) => normalizeKey(item.start) === normalizeKey(heading));
    if (!exists) {
      headings.push({
        title: title || heading,
        start: heading,
      });
    }
  }

  if (headings.length === 0) {
    return [
      {
        title: 'Contenido del curso',
        start: cleanText(text).slice(0, 72),
        end: null,
      },
    ];
  }

  return headings.slice(0, 12).map((item, index, collection) => ({
    title: item.title,
    start: item.start,
    end: collection[index + 1]?.start ?? null,
  }));
}

function buildGenericBlueprint(file, extracted, order) {
  return {
    match: file.name,
    title: extracted.title || file.name.replace(/\.pdf$/i, ''),
    description: 'Curso indexado desde material original para integrarlo como contenido nativo en el campus de AURA.',
    tier: 'PREMIUM',
    level: 'Chef Avanzado',
    order,
    tags: ['drive-import', 'pdf-indexed', 'academy'],
    modules: deriveAutomaticModules(extracted.text),
  };
}

function buildCoursePayload(file, extracted, order) {
  const blueprint = findBlueprint(file.name) || buildGenericBlueprint(file, extracted, order);
  const automaticModules = deriveAutomaticModules(extracted.text);

  function materializeModules(moduleBlueprints) {
    return moduleBlueprints.map((module, index) => {
      const sectionText = sliceSection(extracted.text, module.start, module.end);
      const moduleTitle = resolveModuleTitle(module);
      const lessonTitle = resolveLessonTitle(module);
      const content = isClosureSection(module)
        ? buildClosureLessonContent(blueprint.title)
        : formatLessonContent(sectionText);

      return {
        title: moduleTitle,
        order_index: index + 1,
        lesson: {
          title: lessonTitle,
          duration: estimateDuration(sectionText),
          order_index: 1,
          content,
        },
      };
    });
  }

  let modules;
  try {
    modules = materializeModules(blueprint.modules);
  } catch (error) {
    if (!automaticModules.length) throw error;
    modules = materializeModules(automaticModules);
  }

  return {
    title: blueprint.title,
    description: blueprint.description,
    tier: blueprint.tier,
    level: blueprint.level,
    duration: estimateDuration(extracted.text),
    course_order: blueprint.order,
    lessons_count: modules.length,
    tags: blueprint.tags || ['drive-import', 'academy'],
    modules,
    source: {
      fileId: file.id,
      fileName: file.name,
      pageCount: extracted.page_count,
      wordCount: countWords(extracted.text),
    },
  };
}

async function fetchFolderHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo leer la carpeta de Drive (${res.status})`);
  }
  return res.text();
}

async function downloadPdf(file) {
  const directUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
  const res = await fetch(directUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar ${file.name} (${res.status})`);
  }

  const outputPath = path.join(downloadsDir, safeFilename(file.name, file.id));
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function extractPdf(pdfPath) {
  const stdout = execFileSync(
    'python',
    [
      path.resolve(__dirname, 'extract_book_pdf.py'),
      '--path',
      pdfPath,
      '--out-dir',
      extractDir,
      '--max-pages',
      '30',
      '--min-text-chars',
      '0',
      '--max-chars-per-page',
      '0',
    ],
    { encoding: 'utf8' },
  );

  return JSON.parse(stdout);
}

async function resolveCourseRow(academy, payload) {
  const { data: courses, error } = await academy
    .from('courses')
    .select('id,title,course_order,tags,created_at')
    .order('created_at');

  if (error) throw error;

  const titleKey = normalizeKey(payload.title);
  const fileKey = normalizeKey(payload.source?.fileName || '');
  const targetOrder = Number(payload.course_order ?? -1);

  return (courses || []).find((course) => {
    const courseKey = normalizeKey(course.title);
    const orderMatch = Number(course.course_order ?? -1) === targetOrder;
    const tagMatch = Array.isArray(course.tags) && course.tags.includes('drive-import');
    return courseKey === titleKey || courseKey === fileKey || (orderMatch && tagMatch);
  }) || null;
}

async function resetCourseTree(academy, courseId) {
  const { data: modules, error: modulesLookupError } = await academy.from('modules').select('id').eq('course_id', courseId);
  if (modulesLookupError) throw modulesLookupError;

  const moduleIds = (modules || []).map((item) => item.id);
  if (moduleIds.length > 0) {
    const { error: lessonsError } = await academy.from('lessons').delete().in('module_id', moduleIds);
    if (lessonsError) throw lessonsError;
  }

  const { error: examsError } = await academy.from('exams').delete().eq('course_id', courseId);
  if (examsError) throw examsError;

  const { error: modulesError } = await academy.from('modules').delete().eq('course_id', courseId);
  if (modulesError) throw modulesError;
}

async function insertCourseTree(academy, payload) {
  const courseValues = {
    title: payload.title,
    description: payload.description,
    level: payload.level,
    duration: payload.duration,
    lessons_count: payload.lessons_count,
    tier: payload.tier,
    is_premium: payload.tier !== 'FREE',
    is_ai_generated: false,
    status: 'published',
    author: 'AURA GASTRONOMY',
    tags: payload.tags,
    course_order: payload.course_order,
  };

  const existingCourse = await resolveCourseRow(academy, payload);
  if (existingCourse) {
    await resetCourseTree(academy, existingCourse.id);
  }

  const courseQuery = existingCourse
    ? academy.from('courses').update(courseValues).eq('id', existingCourse.id)
    : academy.from('courses').insert(courseValues);

  const { data: courseRow, error: courseError } = await courseQuery.select('id,title').single();
  if (courseError) throw courseError;

  const { data: moduleRows, error: moduleError } = await academy
    .from('modules')
    .insert(
      payload.modules.map((module) => ({
        course_id: courseRow.id,
        title: module.title,
        content: null,
        order_index: module.order_index,
      })),
    )
    .select('id');

  if (moduleError) throw moduleError;

  const lessonsPayload = (moduleRows || []).map((moduleRow, index) => ({
    module_id: moduleRow.id,
    title: payload.modules[index].lesson.title,
    content: payload.modules[index].lesson.content,
    duration: payload.modules[index].lesson.duration,
    order_index: payload.modules[index].lesson.order_index,
    video_url: null,
  }));

  if (lessonsPayload.length > 0) {
    const { error: lessonsError } = await academy.from('lessons').insert(lessonsPayload);
    if (lessonsError) throw lessonsError;
  }

  return courseRow;
}

const COURSE_BLUEPRINTS = [
  {
    match: 'Gastronomia Sostenible El Chef como Agente de Cambio',
    title: 'Gastronom\u00eda Sostenible: El Chef como Agente de Cambio',
    description: 'Programa profesional sobre liderazgo culinario responsable, biodiversidad marina, preservaci\u00f3n inteligente y estrategias zero waste aplicadas a la alta cocina.',
    tier: 'PRO',
    level: 'Chef Profesional',
    order: 1,
    tags: ['sostenibilidad', 'zero-waste', 'biodiversidad', 'drive-import'],
    modules: [
      { title: 'Etica ambiental y liderazgo del chef', start: '1. Modulo I: Etica Ambiental y el Nuevo Paradigma de la Excelencia', end: '2. Modulo II: Biodiversidad Marina y "Pesca con Futuro"' },
      { title: 'Biodiversidad marina y pesca con futuro', start: '2. Modulo II: Biodiversidad Marina y "Pesca con Futuro"', end: '3. Modulo III: Tecnologias de Preservacion y Reduccion del Desperdicio' },
      { title: 'Tecnologias de preservacion y reduccion del desperdicio', start: '3. Modulo III: Tecnologias de Preservacion y Reduccion del Desperdicio', end: '4. Modulo IV: Gestion Zero Waste y la Despensa Modernista' },
      { title: 'Gestion zero waste y despensa modernista', start: '4. Modulo IV: Gestion Zero Waste y la Despensa Modernista', end: '5. Modulo V: Proyectos de Impacto Social y Futuro de la Gastronomia' },
      { title: 'Impacto social y futuro de la gastronomia', start: '5. Modulo V: Proyectos de Impacto Social y Futuro de la Gastronomia', end: null },
    ],
  },
  {
    match: 'Management de Alta Gastronomia Operativa y Estandares Michelin',
    title: 'Management de Alta Gastronom\u00eda: Operativa y Est\u00e1ndares Michelin',
    description: 'Programa centrado en auditor\u00eda Michelin, operativa de sala y cocina, tecnolog\u00eda de producci\u00f3n y sostenibilidad aplicada a direcci\u00f3n gastron\u00f3mica.',
    tier: 'PRO',
    level: 'Chef Executive',
    order: 2,
    tags: ['management', 'michelin', 'operativa', 'drive-import'],
    modules: [
      { title: 'Genesis Michelin y proceso de inspeccion', start: '1. Genesis y Evolucion de la Guia Michelin (1900 Actualidad)', end: '3. Analisis Tecnico de los 5 Criterios de Evaluacion Michelin' },
      { title: 'Criterios Michelin y arquitectura de distinciones', start: '3. Analisis Tecnico de los 5 Criterios de Evaluacion Michelin', end: '5. Gestion Operativa Avanzada y Tecnologias de Produccion' },
      { title: 'Gestion operativa y tecnologias de produccion', start: '5. Gestion Operativa Avanzada y Tecnologias de Produccion', end: '7. Sostenibilidad y Economia Circular: El Modelo de la Estrella Verde' },
      { title: 'Sostenibilidad, emplatado y sintesis ejecutiva', start: '7. Sostenibilidad y Economia Circular: El Modelo de la Estrella Verde', end: null },
    ],
  },
  {
    match: 'Guia Academica Curriculo Avanzado para Profesionales de la Gastronomia',
    title: 'Gu\u00eda Acad\u00e9mica: Curr\u00edculo Avanzado para Profesionales de la Gastronom\u00eda',
    description: 'Recorrido avanzado por ciencia culinaria, seguridad alimentaria, fermentaci\u00f3n, creatividad Sapiens y rentabilidad para cocina de alto rendimiento.',
    tier: 'PREMIUM',
    level: 'Chef Executive',
    order: 3,
    tags: ['curriculo-avanzado', 'sapiens', 'foodpairing', 'drive-import'],
    modules: [
      { title: 'Introduccion al programa y metodologia Sapiens', start: '1. Introduccion al Programa y Metodologia Sapiens', end: '2. Curso I: La Ciencia de los Alimentos y Fisica del Calor' },
      { title: 'Ciencia de los alimentos y transferencia de calor', start: '2. Curso I: La Ciencia de los Alimentos y Fisica del Calor', end: '2.1. Modulo 2: Microbiologia y Seguridad Alimentaria' },
      { title: 'Seguridad alimentaria, hidrocoloides y sous-vide', start: '2.1. Modulo 2: Microbiologia y Seguridad Alimentaria', end: '4. Curso III: Fermentaciones Avanzadas y Panaderia Modernista' },
      { title: 'Fermentaciones avanzadas y panaderia modernista', start: '4. Curso III: Fermentaciones Avanzadas y Panaderia Modernista', end: '5. Curso IV: Teoria del Sabor, Foodpairing y Creatividad Sapiens' },
      { title: 'Foodpairing, creatividad y emplatado', start: '5. Curso IV: Teoria del Sabor, Foodpairing y Creatividad Sapiens', end: '6. Curso V: Business Gastronomico, Costeo y Marketing de Autor' },
      { title: 'Business gastronomico y gestion operativa', start: '6. Curso V: Business Gastronomico, Costeo y Marketing de Autor', end: '7. Conclusion y Requisitos de Certificacion' },
      { title: 'Cierre de curso', start: '7. Conclusion y Requisitos de Certificacion', end: null },
    ],
  },
  {
    match: 'Master en Ingenieria de Texturas Y Cocina Molecular',
    title: 'M\u00e1ster en Ingenier\u00eda de Texturas y Cocina Molecular',
    description: 'Formaci\u00f3n avanzada en dispersiones coloidales, hidrocoloides, esferificaci\u00f3n, criococina y equipamiento de laboratorio para cocina de precisi\u00f3n.',
    tier: 'PREMIUM',
    level: 'Chef Elite',
    order: 4,
    tags: ['texturas', 'cocina-molecular', 'hidrocoloides', 'drive-import'],
    modules: [
      { title: 'Introduccion a la ciencia culinaria contemporanea', start: '1. Introduccion: La Evolucion de la Ciencia Culinaria y la Reconceptualizacion del Gusto', end: '2. Modulo 1: Fundamentos Fisicos y Quimica de los Alimentos' },
      { title: 'Fundamentos fisicos y quimica de los alimentos', start: '2. Modulo 1: Fundamentos Fisicos y Quimica de los Alimentos', end: '3. Modulo 2: La Despensa Modernista y Agentes de Textura' },
      { title: 'Despensa modernista y agentes de textura', start: '3. Modulo 2: La Despensa Modernista y Agentes de Textura', end: '4. Modulo 3: Ingenieria de la Membrana y Esferificacion' },
      { title: 'Esferificacion y coccion de precision', start: '4. Modulo 3: Ingenieria de la Membrana y Esferificacion', end: '6. Modulo 5: Equipamiento de Laboratorio en la Alta Cocina' },
      { title: 'Equipamiento de laboratorio en la alta cocina', start: '6. Modulo 5: Equipamiento de Laboratorio en la Alta Cocina', end: '7. Modulo 6: Creatividad y Filosofia de la Vanguardia' },
      { title: 'Creatividad y filosofia de la vanguardia', start: '7. Modulo 6: Creatividad y Filosofia de la Vanguardia', end: '8. Modulo 7: Arquitectura de la Excelencia y Estandares Michelin' },
      { title: 'Arquitectura de la excelencia y estandares Michelin', start: '8. Modulo 7: Arquitectura de la Excelencia y Estandares Michelin', end: null },
    ],
  },
  {
    match: 'Maestria en Alta Gastronomia de Vanguardia Ciencia Tecnica y Excelencia',
    title: 'Maestr\u00eda en Alta Gastronom\u00eda de Vanguardia: Ciencia, T\u00e9cnica y Excelencia',
    description: 'Maestr\u00eda especializada en ecosistema Michelin, hidrocoloides, esferificaci\u00f3n, criococina, equipamiento de laboratorio y narrativa aplicada al plato.',
    tier: 'PREMIUM',
    level: 'Chef Elite',
    order: 5,
    tags: ['vanguardia', 'michelin', 'esferificacion', 'drive-import'],
    modules: [
      { title: 'Ecosistema Michelin y paradigma culinario', start: '1. Introduccion a la Gastronomia de Vanguardia y el Ecosistema Michelin', end: '2. Fundamentos Cientificos y la Despensa Modernista' },
      { title: 'Despensa modernista y fundamentos cientificos', start: '2. Fundamentos Cientificos y la Despensa Modernista', end: '3. Modulo Tecnico I: Esferificacion y Dispersiones Coloidales' },
      { title: 'Esferificacion y dispersiones coloidales', start: '3. Modulo Tecnico I: Esferificacion y Dispersiones Coloidales', end: '4.2. Criococina y Nitrogeno Liquido' },
      { title: 'Coccion de precision y criococina', start: '4.2. Criococina y Nitrogeno Liquido', end: '5. Equipamiento Especializado de Laboratorio Culinario' },
      { title: 'Equipamiento especializado y legado de maestros', start: '5. Equipamiento Especializado de Laboratorio Culinario', end: '7. Estetica, Narrativa y Casos Practicos' },
      { title: 'Estetica, narrativa y casos practicos', start: '7. Estetica, Narrativa y Casos Practicos', end: null },
    ],
  },
  {
    match: 'Postgrado Profesional Metodologia Sapiens y Estrategia de Innovacion Gastronomica',
    title: 'Postgrado Profesional: Metodolog\u00eda Sapiens y Estrategia de Innovaci\u00f3n Gastron\u00f3mica',
    description: 'Postgrado de investigaci\u00f3n creativa que conecta metodolog\u00eda Sapiens, decodificaci\u00f3n de producto, laboratorio culinario y auditor\u00eda de excelencia.',
    tier: 'PREMIUM',
    level: 'Chef Elite',
    order: 6,
    tags: ['sapiens', 'innovacion', 'laboratorio', 'drive-import'],
    modules: [
      { title: 'Fundamentos historicos de la vanguardia', start: '1. Fundamentos Historicos y Conceptuales de la Gastronomia de Vanguardia', end: '2. Modulo I: La Metodologia Sapiens y el Genoma de la Cocina' },
      { title: 'Metodologia Sapiens y genoma de la cocina', start: '2. Modulo I: La Metodologia Sapiens y el Genoma de la Cocina', end: '3. Modulo II: Decodificacion del Producto y Transformacion Tecnica' },
      { title: 'Decodificacion del producto y transformacion tecnica', start: '3. Modulo II: Decodificacion del Producto y Transformacion Tecnica', end: '4. Modulo III: Tecnicas Avanzadas de Ingenieria Culinaria' },
      { title: 'Tecnicas avanzadas de ingenieria culinaria', start: '4. Modulo III: Tecnicas Avanzadas de Ingenieria Culinaria', end: '5. Modulo IV: El Laboratorio Gastronomico y Equipamiento de Vanguardia' },
      { title: 'Laboratorio gastronomico y equipamiento de vanguardia', start: '5. Modulo IV: El Laboratorio Gastronomico y Equipamiento de Vanguardia', end: '6. Modulo V: Estrategia de Innovacion y Reconceptualizacion' },
      { title: 'Estrategia de innovacion y reconceptualizacion', start: '6. Modulo V: Estrategia de Innovacion y Reconceptualizacion', end: '7. Modulo VI: Estandares de Excelencia y Auditoria Externa (Modelo Michelin)' },
      { title: 'Excelencia, auditoria externa y cierre del curso', start: '7. Modulo VI: Estandares de Excelencia y Auditoria Externa (Modelo Michelin)', end: null },
    ],
  },
  {
    match: 'SOMMELIER DE VANGUARDIA E INNOVACION EN EL MUNDO LIQUIDO',
    title: 'SOMMELIER DE VANGUARDIA E INNOVACI\u00d3N EN EL MUNDO L\u00cdQUIDO',
    description: 'Programa especializado en sumiller\u00eda contempor\u00e1nea, an\u00e1lisis sensorial, mixolog\u00eda molecular, tecnolog\u00eda de laboratorio y maridaje multisensorial.',
    tier: 'PREMIUM',
    level: 'Sommelier Elite',
    order: 7,
    tags: ['sommelier', 'mixologia', 'maridaje', 'drive-import'],
    modules: [
      { title: 'Nuevo paradigma de la sumilleria', start: '1. Introduccion al Nuevo Paradigma de la Sumilleria', end: '2. Modulo I: Analisis Sensorial Avanzado y Reologia del Liquido' },
      { title: 'Analisis sensorial avanzado y reologia del liquido', start: '2. Modulo I: Analisis Sensorial Avanzado y Reologia del Liquido', end: '3. Modulo II: Metodologia Sapiens Aplicada a la Vitivinicultura' },
      { title: 'Metodologia Sapiens aplicada a la vitivinicultura', start: '3. Modulo II: Metodologia Sapiens Aplicada a la Vitivinicultura', end: '4. Modulo III: Gestion Estrategica y Estandares Michelin en la Sala' },
      { title: 'Gestion estrategica y estandares Michelin en la sala', start: '4. Modulo III: Gestion Estrategica y Estandares Michelin en la Sala', end: '5. Modulo IV: Cocteleria de Vanguardia y Mixologia Molecular' },
      { title: 'Cocteleria de vanguardia y mixologia molecular', start: '5. Modulo IV: Cocteleria de Vanguardia y Mixologia Molecular', end: '6. Modulo V: Tecnologia de Laboratorio en la Elaboracion de Bebidas' },
      { title: 'Tecnologia de laboratorio en elaboracion de bebidas', start: '6. Modulo V: Tecnologia de Laboratorio en la Elaboracion de Bebidas', end: '7. Modulo VI: Neurogastronomia y Maridaje Multisensorial' },
      { title: 'Neurogastronomia y maridaje multisensorial', start: '7. Modulo VI: Neurogastronomia y Maridaje Multisensorial', end: null },
    ],
  },
];

function findBlueprint(name) {
  const key = normalizeKey(name);
  return COURSE_BLUEPRINTS.find((item) => {
    const matchKey = normalizeKey(item.match);
    return key === matchKey || key.includes(matchKey) || matchKey.includes(key);
  }) || null;
}

async function main() {
  const url = process.env.SUPABASE_ACADEMY_URL || process.env.NEXT_PUBLIC_SUPABASE_ACADEMY_URL;
  const key = process.env.SUPABASE_ACADEMY_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Faltan SUPABASE_ACADEMY_URL/NEXT_PUBLIC_SUPABASE_ACADEMY_URL o SUPABASE_ACADEMY_SERVICE_KEY');
  }

  const html = await fetchFolderHtml(folderUrl || DEFAULT_FOLDER_URL);
  const files = parseFolderEntries(html);
  if (files.length === 0) {
    throw new Error('No se encontraron PDFs publicos en la carpeta de Drive');
  }

  const prepared = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const pdfPath = await downloadPdf(file);
    const extracted = extractPdf(pdfPath);
    prepared.push(buildCoursePayload(file, extracted, index + 1));
  }

  prepared.sort((left, right) => left.course_order - right.course_order);

  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      folderUrl: folderUrl || DEFAULT_FOLDER_URL,
      courses: prepared.map((course) => ({
        title: course.title,
        tier: course.tier,
        level: course.level,
        course_order: course.course_order,
        lessons_count: course.lessons_count,
        source: course.source,
      })),
    }, null, 2));
    return;
  }

  const academy = createClient(url, key);
  const imported = [];

  for (const course of prepared) {
    const row = await insertCourseTree(academy, course);
    imported.push({
      id: row.id,
      title: row.title,
      tier: course.tier,
      modules: course.modules.length,
      source: course.source.fileName,
    });
  }

  console.log(JSON.stringify({
    mode: 'apply',
    folderUrl: folderUrl || DEFAULT_FOLDER_URL,
    imported,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
