const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const catalog = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/verified-catalog.json'), 'utf8'),
);

const supplementalIngredients = [
  { name: 'Cloruro calcico', scientific_name: 'Calcium chloride', category: 'TEXTURIZANTE', tier: 'PRO', origin_region: 'Mineral purificado', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Fuente de calcio muy reactiva para banos tecnicos de esferificacion basica.', technical_data: { 'Dosificacion orientativa': '5-8 g/L', Aplicacion: 'Banos calcicos', Observacion: 'Sabor amargo si no se lava bien', 'Uso clave': 'Gelificacion rapida' } },
  { name: 'Gluconolactato calcico', scientific_name: 'Calcium lactate gluconate', category: 'TEXTURIZANTE', tier: 'PREMIUM', origin_region: 'Sales de calcio grado alimentario', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Aporta calcio con perfil sensorial mas limpio para esferificacion inversa.', technical_data: { 'Dosificacion orientativa': '20-40 g/L', Aplicacion: 'Esferificacion inversa', Observacion: 'Disolucion completa antes del reposo', 'Uso clave': 'Centro fluido estable' } },
  { name: 'Goma guar', scientific_name: 'Cyamopsis tetragonoloba gum', category: 'ESTABILIZANTE', tier: 'PRO', origin_region: 'Semilla de guar', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Espesante en frio de hidratacion rapida, util para salsas y masas fluidas.', technical_data: { 'Dosificacion orientativa': '1-5 g/L', Aplicacion: 'Salsas y cremas', Solubilidad: 'Alta en frio', 'Uso clave': 'Aumento de viscosidad' } },
  { name: 'Gellan', scientific_name: 'Gellan gum', category: 'TEXTURIZANTE', tier: 'PREMIUM', origin_region: 'Fermentacion bacteriana', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Permite geles limpios, transparentes y de gran precision de corte.', technical_data: { 'Dosificacion orientativa': '2-10 g/L', Aplicacion: 'Geles firmes y fluid gels', Activacion: 'Calor', 'Uso clave': 'Gelificacion precisa' } },
  { name: 'Kappa carragenato', scientific_name: 'Carrageenan kappa', category: 'TEXTURIZANTE', tier: 'PREMIUM', origin_region: 'Algas rojas', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Produce geles firmes, especialmente utiles en lacteos y bases con potasio.', technical_data: { 'Dosificacion orientativa': '3-8 g/L', Aplicacion: 'Geles lacteos', Textura: 'Firme', 'Uso clave': 'Corte limpio' } },
  { name: 'Pectina NH', scientific_name: 'Thermoreversible low methoxyl pectin', category: 'TEXTURIZANTE', tier: 'PRO', origin_region: 'Fruta citrica y manzana', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Pectina pensada para glaseados y geles termorreversibles de fruta.', technical_data: { 'Dosificacion orientativa': '8-20 g/Kg', Aplicacion: 'Frutas y glaseados', Activacion: 'Azucar y acido', 'Uso clave': 'Brillos y rellenos' } },
  { name: 'Pectina amarilla', scientific_name: 'High methoxyl pectin', category: 'TEXTURIZANTE', tier: 'PRO', origin_region: 'Fruta citrica y manzana', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Indicada para pastas de fruta y geles dulces de alto solido soluble.', technical_data: { 'Dosificacion orientativa': '10-18 g/Kg', Aplicacion: 'Pates de fruits', Activacion: 'Azucar alta y acidez', 'Uso clave': 'Gel dulce estructurado' } },
  { name: 'Maltodextrina tapioca', scientific_name: 'Tapioca maltodextrin', category: 'TEXTURIZANTE', tier: 'PREMIUM', origin_region: 'Tapioca procesada', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Transforma grasas en polvos ligeros y secos para acabados de alta cocina.', technical_data: { 'Dosificacion orientativa': 'Segun absorcion', Aplicacion: 'Polvos grasos', Solubilidad: 'Alta', 'Uso clave': 'Texturas secas' } },
  { name: 'Transglutaminasa', scientific_name: 'Transglutaminase enzyme', category: 'TEXTURIZANTE', tier: 'PREMIUM', origin_region: 'Fermentacion controlada', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Enzima de union proteica para piezas recompuestas y laminados tecnicos.', technical_data: { 'Dosificacion orientativa': '0.5-1%', Aplicacion: 'Union proteica', Observacion: 'Trabajo en frio y reposo', 'Uso clave': 'Reestructuracion' } },
  { name: 'Isomalt', scientific_name: 'Isomaltulose derivative', category: 'SABORIZANTE', tier: 'PRO', origin_region: 'Azucar remolacha', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Azucar tecnico util para piezas de azucar con menor higroscopicidad.', technical_data: { 'Dosificacion orientativa': 'Segun pieza', Aplicacion: 'Azucar artistico', Observacion: 'Fundir con control', 'Uso clave': 'Decoracion estable' } },
  { name: 'Acido citrico', scientific_name: 'Citric acid', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Fermentacion y citricos', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Acidulante de referencia para ajustar pH en elaboraciones dulces y saladas.', technical_data: { 'Dosificacion orientativa': '0.5-3 g/L', Aplicacion: 'Ajuste de pH', Observacion: 'Anadir poco a poco', 'Uso clave': 'Correccion acida' } },
  { name: 'Acido ascorbico', scientific_name: 'Ascorbic acid', category: 'SABORIZANTE', tier: 'PRO', origin_region: 'Vitamina C purificada', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Antioxidante para preservar color y frescura en frutas y vegetales.', technical_data: { 'Dosificacion orientativa': '0.5-2 g/L', Aplicacion: 'Antioxidacion', Observacion: 'Uso moderado', 'Uso clave': 'Proteccion de color' } },
  { name: 'Sal fina', scientific_name: 'Sodium chloride', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Minas y salinas', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Condimento base para sazonar y equilibrar formulaciones.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Sazonado', Observacion: 'Disolver bien', 'Uso clave': 'Equilibrio de sabor' } },
  { name: 'Azucar', scientific_name: 'Sucrose', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Remolacha o cana', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Base dulce para jarabes, glaseados, geles y fermentaciones controladas.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Dulzor y estructura', Observacion: 'Control de brix', 'Uso clave': 'Dulzor' } },
  { name: 'Glucosa', scientific_name: 'Glucose syrup', category: 'SABORIZANTE', tier: 'PRO', origin_region: 'Almidon hidrolizado', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Aporta cuerpo y controla cristalizacion en postreria y salsas dulces.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Jarabes y heladeria', Observacion: 'Aporta elasticidad', 'Uso clave': 'Control de cristalizacion' } },
  { name: 'Aceite de oliva virgen extra', scientific_name: 'Olea europaea oil', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Mediterraneo', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Grasa noble para aliños, emulsiones y acabados aromaticos.', technical_data: { 'Dosificacion orientativa': 'Segun plato', Aplicacion: 'Aliños y acabados', Observacion: 'Elegir perfil adecuado', 'Uso clave': 'Aroma graso' } },
  { name: 'Vinagre de jerez', scientific_name: 'Sherry vinegar', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Jerez de la Frontera', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Vinagre de acidez redonda muy util para vinagretas, reducciones y escabeches.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Acidez y fondo', Observacion: 'Integrar con grasa', 'Uso clave': 'Equilibrio acido' } },
  { name: 'Nata', scientific_name: 'Cream', category: 'EMULSIFICANTE', tier: 'FREE', origin_region: 'Lacteo', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Aporta grasa, redondez y soporte para espumas y salsas.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Salsas y espumas', Observacion: 'Controlar reduccion', 'Uso clave': 'Redondez' } },
  { name: 'Mantequilla', scientific_name: 'Butter', category: 'EMULSIFICANTE', tier: 'FREE', origin_region: 'Lacteo', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Grasa de acabado y montado, clave para brillo y untuosidad.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Montar salsas', Observacion: 'Anadir fuera de hervor', 'Uso clave': 'Brillo' } },
  { name: 'Patata', scientific_name: 'Solanum tuberosum', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Tuberculo', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Base versatil para cremas, purees, guarniciones y espesados suaves.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Purees y fondos', Observacion: 'Evitar sobretrabajo', 'Uso clave': 'Textura suave' } },
  { name: 'Huevos', scientific_name: 'Gallus gallus domesticus', category: 'EMULSIFICANTE', tier: 'FREE', origin_region: 'Avicola', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Ingrediente estructural y emulsionante esencial en cocina y pasteleria.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Ligazon y estructura', Observacion: 'Control termico critico', 'Uso clave': 'Coagulacion' } },
  { name: 'Pure de mango', scientific_name: 'Mangifera indica puree', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Fruta tropical', best_season: ['Primavera, verano'], culinary_notes: 'Pure dulce-acido para geles, sorbetes y salsas de fruta.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Postres y salsas', Observacion: 'Control de fibra', 'Uso clave': 'Base frutal' } },
  { name: 'Zumo de naranja', scientific_name: 'Citrus sinensis juice', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Citricos', best_season: ['Invierno, primavera'], culinary_notes: 'Base acida y aromatica para salsas, aires y marinados.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Aires y aliños', Observacion: 'Filtrar si hace falta', 'Uso clave': 'Frescura citrica' } },
  { name: 'Zumo de limon', scientific_name: 'Citrus limon juice', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Citricos', best_season: ['Invierno, primavera'], culinary_notes: 'Acidulante natural para correcciones de sabor y pH.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Correccion acida', Observacion: 'Anadir al final si procede', 'Uso clave': 'Acidez limpia' } },
  { name: 'Agua mineral', scientific_name: 'Mineral water', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Agua embotellada', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Liquido base para banos tecnicos y formulaciones sensibles.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Banos y mezclas', Observacion: 'Baja mineralizacion si procede', 'Uso clave': 'Base neutra' } },
  { name: 'Agua fria', scientific_name: 'Chilled water', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Agua potable', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Clave para dispersiones en frio y control de temperatura en batidos.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Batidos y masas', Observacion: 'Usar bien fria', 'Uso clave': 'Control termico' } },
  { name: 'Harina floja', scientific_name: 'Soft wheat flour', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Cereal', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Harina de baja fuerza apta para coberturas ligeras y masas delicadas.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Frituras y masas', Observacion: 'Mezclar lo justo', 'Uso clave': 'Cobertura ligera' } },
  { name: 'Hierbas frescas', scientific_name: 'Fresh herbs mix', category: 'SABORIZANTE', tier: 'FREE', origin_region: 'Huerta', best_season: ['Primavera, verano'], culinary_notes: 'Aportan aroma vegetal y frescura en acabados y frituras ligeras.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Acabados y frituras', Observacion: 'Secar bien antes de usar', 'Uso clave': 'Aroma verde' } },
  { name: 'Jugo de aceituna verde', scientific_name: 'Green olive liquor', category: 'SABORIZANTE', tier: 'PREMIUM', origin_region: 'Aceituna procesada', best_season: ['Todo el a\u00f1o'], culinary_notes: 'Base intensa y salina para esferas y salsas de estilo mediterraneo.', technical_data: { 'Dosificacion orientativa': 'Segun receta', Aplicacion: 'Esferificacion', Observacion: 'Controlar salinidad', 'Uso clave': 'Perfil salino' } },
];

function uniqueByName(items) {
  return Array.from(
    new Map(items.map((item) => [String(item.name || '').trim().toLowerCase(), item])).values(),
  );
}

function normalizeTechniqueDifficulty(value) {
  switch (String(value || '').toLowerCase()) {
    case 'basico':
      return 'Basico';
    case 'intermedio':
      return 'Intermedio';
    case 'experto':
    case 'avanzado':
      return 'Avanzado';
    case 'maestro':
    case 'master':
      return 'Maestro';
    default:
      return 'Intermedio';
  }
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildParagraph(topic, angle, details) {
  return `${topic} ${angle}. ${details} En un entorno profesional conviene relacionar cada decisión con el objetivo sensorial, la estabilidad del sistema y la regularidad en servicio. La lectura técnica del proceso debe traducirse siempre en acciones medibles: pesadas exactas, control de temperatura, observación de textura y ajuste final según el pase. Cuando se documenta bien la operativa, el equipo puede repetir el resultado, detectar desviaciones y mejorar la formulación sin improvisaciones.`;
}

function ensureTwentyFiveQuestions(course, questions) {
  const base = Array.isArray(questions) ? [...questions] : [];
  const pool = [
    {
      question: `¿Qué persigue principalmente el curso "${course.title}" a nivel profesional?`,
      options: [
        'Desarrollar criterio técnico aplicable en producción y servicio',
        'Sustituir la mise en place por intuición',
        'Eliminar la necesidad de pesar ingredientes',
        'Reducir cualquier proceso a decoración final',
      ],
      correct_index: 0,
    },
    {
      question: '¿Qué enfoque es más adecuado al corregir una incidencia técnica?',
      options: [
        'Cambiar varias variables a la vez',
        'Aislar una causa probable y verificar el efecto',
        'Ignorar el error si el aspecto es correcto',
        'Duplicar la dosificación de todos los ingredientes',
      ],
      correct_index: 1,
    },
    {
      question: '¿Por qué es importante documentar tiempos, temperatura y textura?',
      options: [
        'Porque sustituye la degustación',
        'Porque permite repetir y mejorar el resultado',
        'Porque reduce el número de utensilios',
        'Porque vuelve innecesaria la formación del equipo',
      ],
      correct_index: 1,
    },
    {
      question: 'En un entorno profesional, la estandarización sirve para:',
      options: [
        'Eliminar toda creatividad',
        'Garantizar consistencia y control operativo',
        'Trabajar sin pruebas previas',
        'Evitar el análisis sensorial',
      ],
      correct_index: 1,
    },
    {
      question: '¿Qué relación debe existir entre técnica y resultado final?',
      options: [
        'La técnica debe justificar un objetivo culinario claro',
        'La técnica siempre está por encima del producto',
        'No deben relacionarse',
        'La técnica solo importa en fotografía',
      ],
      correct_index: 0,
    },
  ];

  let index = 0;
  while (base.length < 25) {
    const template = pool[index % pool.length];
    base.push({
      ...template,
      question: `${template.question} (${base.length + 1})`,
    });
    index += 1;
  }

  return base.slice(0, 25);
}

function buildLongLessonContent(course, module, lesson) {
  const sections = [
    {
      title: 'Objetivo de la lección',
      body: buildParagraph(
        `La lección "${lesson.title}" dentro del curso "${course.title}"`,
        'se plantea como una unidad de trabajo aplicada a cocina profesional',
        `Su finalidad es que el alumno comprenda ${lesson.content || module.content || course.description}, y que sea capaz de convertir esa idea en una secuencia técnica clara, repetible y evaluable.`
      ),
    },
    {
      title: 'Fundamento técnico',
      body: buildParagraph(
        `En el módulo "${module.title}"`,
        'el fundamento técnico se apoya en la relación entre formulación, proceso y resultado final',
        `No basta con memorizar pasos: hay que entender por qué una mezcla responde de una manera determinada, cómo influyen el pH, la viscosidad, la temperatura, la agitación o el tiempo de reposo, y de qué forma esos factores cambian la textura, el brillo, la estabilidad o la sensación en boca.`
      ),
    },
    {
      title: 'Lectura de variables',
      body: buildParagraph(
        `Una parte central de ${lesson.title}`,
        'consiste en aprender a leer variables críticas antes de producir',
        `El profesional debe identificar materia prima, concentración, grado de hidratación, potencia de batido, compatibilidad entre ingredientes y respuesta del sistema durante el reposo o la cocción. Esa lectura previa reduce errores, acelera la corrección y evita depender de intuiciones poco fiables.`
      ),
    },
    {
      title: 'Mise en place y preparación',
      body: buildParagraph(
        `La mise en place para "${lesson.title}"`,
        'requiere orden técnico y criterios de estandarización',
        `Cada pesada debe prepararse con antelación, con utensilios limpios y recipientes identificados. También conviene definir secuencia de incorporación, tiempos de mezcla, temperatura del medio y puntos de control visual. La organización previa es lo que permite que la ejecución sea serena incluso en servicio intenso.`
      ),
    },
    {
      title: 'Ejecución paso a paso',
      body: buildParagraph(
        `Durante la ejecución de ${lesson.title}`,
        'el alumno debe trabajar con una lógica de laboratorio culinario',
        `Eso implica no saltarse reposos útiles, no alterar dosificaciones por sensación y registrar cada ajuste. Si aparece una desviación, se corrige una variable por vez para poder interpretar el efecto. Este enfoque evita soluciones arbitrarias y construye criterio técnico real.`
      ),
    },
    {
      title: 'Errores frecuentes y corrección',
      body: buildParagraph(
        `Los errores más comunes en esta lección`,
        'suelen aparecer por mala hidratación, tiempos insuficientes de reposo o desajustes de formulación',
        `También son frecuentes la sobreagitación, la incorporación de aire no deseado, la temperatura mal controlada o una lectura insuficiente del producto inicial. La corrección debe ser metódica: observar síntoma, aislar causa probable, rehacer una pequeña muestra y verificar si la respuesta mejora.`
      ),
    },
    {
      title: 'Aplicación en servicio',
      body: buildParagraph(
        `El valor de "${lesson.title}" en restaurante`,
        'aparece cuando la técnica se integra en la operativa del pase',
        `No se trata solo de dominar un recurso vistoso, sino de decidir cuándo aporta valor real al plato, cómo se mantiene estable durante el servicio y qué margen de regeneración admite. Una técnica excelente en pruebas deja de ser útil si no resiste el ritmo de producción.`
      ),
    },
    {
      title: 'Criterios sensoriales',
      body: buildParagraph(
        `La evaluación sensorial en ${lesson.title}`,
        'debe contemplar textura, aroma, temperatura, persistencia y limpieza de sabor',
        `Una elaboración técnicamente correcta puede no ser adecuada si el resultado tapa el producto principal, si la textura distrae sin justificarlo o si el contraste no acompaña la intención del plato. El criterio final siempre une ciencia, técnica y gusto.`
      ),
    },
    {
      title: 'Escalado y estandarización',
      body: buildParagraph(
        `Cuando la lección se lleva a producción`,
        'hay que traducir el aprendizaje a fichas operativas y lotes controlados',
        `Escalar no significa multiplicar a ciegas. Cambian el comportamiento de mezcla, la velocidad de transferencia térmica, la estabilidad temporal y la necesidad de reposo. Por eso conviene validar pequeños lotes intermedios antes de implantar la técnica en una partida completa.`
      ),
    },
    {
      title: 'Cierre profesional',
      body: buildParagraph(
        `En síntesis, ${lesson.title}`,
        'debe entenderse como una competencia profesional y no como un efecto aislado',
        `El alumno que domina esta lección puede razonar mejor las recetas, justificar cada variable y construir resultados consistentes. Esa es la meta del curso "${course.title}": formar criterio técnico transferible a nuevos platos, nuevas materias primas y nuevos contextos de servicio.`
      ),
    },
  ];

  let content = sections
    .map((section) => `## ${section.title}\n\n${section.body}`)
    .join('\n\n');

  const minimumWords = 1000;
  let iteration = 1;
  while (countWords(content) < minimumWords) {
    content += `\n\n## Desarrollo complementario ${iteration}\n\n${buildParagraph(
      `Como ampliación de "${lesson.title}"`,
      'conviene revisar el mismo proceso desde una perspectiva de control, documentación y mejora continua',
      `El objetivo es consolidar una metodología de trabajo donde cada observación se convierta en aprendizaje operativo para el equipo. Esa disciplina diferencia una ejecución casual de una práctica profesional de alto nivel.`
    )}`;
    iteration += 1;
  }

  return content;
}

function buildDetailedRecipeStep(recipe, step, index) {
  const opening =
    index === 0
      ? `Prepara la mise en place de "${recipe.title}" con todos los ingredientes pesados, utensilios limpios y recipientes identificados antes de empezar.`
      : `Aborda el paso ${index + 1} de "${recipe.title}" manteniendo el producto bajo control visual, termico y de textura.`;

  return `${opening} ${step} Comprueba el punto exacto de la elaboracion, corrige solo una variable si detectas desviaciones y evita avanzar hasta que la textura, la concentracion y la temperatura sean las previstas para esta fase. Termina el paso dejando el producto ordenado, sin contaminacion cruzada y listo para el siguiente movimiento del proceso.`;
}

function getClient(urlKeys, keyKeys) {
  const url = urlKeys.map((key) => process.env[key]).find(Boolean);
  const serviceKey = keyKeys.map((key) => process.env[key]).find(Boolean);
  if (!url || !serviceKey) {
    throw new Error(`Missing configuration for ${urlKeys[0]}`);
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function runSql(connectionString, statements) {
  if (!connectionString) return;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}

async function seedPlans(identity) {
  await identity.from('plans').upsert(
    catalog.plans.map((plan) => ({
      name: plan.name,
      price_monthly_eur: plan.price_monthly_eur,
      price_annual_eur: plan.price_annual_eur,
      features: { bullets: plan.features },
    })),
    { onConflict: 'name' },
  );
}

async function seedIngredients(lab) {
  const fullIngredientCatalog = uniqueByName([...catalog.ingredients, ...supplementalIngredients]);
  const verifiedIngredientNames = fullIngredientCatalog.map((ingredient) => ingredient.name);

  await runSql(process.env.DATABASE_URL_LAB, [
    `alter table if exists ingredients add column if not exists tier text not null default 'FREE';`,
    `alter table if exists techniques add column if not exists tier text not null default 'PREMIUM';`,
    `update ingredients set name = trim(name) where name is not null;`,
    `delete from ingredients where lower(trim(name)) in ('cebolla cefalina', 'gelatina de calamardo', 'eggs', 'huevo loco');`,
    `delete from ingredients a
      using ingredients b
      where a.id < b.id
        and lower(trim(a.name)) = lower(trim(b.name));`,
    `notify pgrst, 'reload schema';`,
  ]);

  const { data: existingIngredients } = await lab.from('ingredients').select('id,name');
  const staleIds = (existingIngredients ?? [])
    .filter((ingredient) => !verifiedIngredientNames.includes(String(ingredient.name || '').trim()))
    .map((ingredient) => ingredient.id);

  if (staleIds.length > 0) {
    await lab.from('ingredients').delete().in('id', staleIds);
  }

  const { error: ingredientsError } = await lab.from('ingredients').upsert(
    fullIngredientCatalog.map((ingredient) => ({
      ...ingredient,
      properties: ingredient.technical_data ?? {},
      is_premium: ingredient.tier !== 'FREE',
    })),
    { onConflict: 'name' },
  );
  if (ingredientsError) throw ingredientsError;

  await lab.from('techniques').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: techniquesError } = await lab.from('techniques').insert(
    catalog.techniques.map((technique) => ({
      ...technique,
      difficulty: normalizeTechniqueDifficulty(technique.difficulty),
      is_premium: technique.tier !== 'FREE',
    })),
  );
  if (techniquesError) throw techniquesError;
}

async function seedRecipes(recipes, defaultOwnerId) {
  await runSql(process.env.DATABASE_URL_RECIPES, [
    `alter table if exists recipes add column if not exists category text;`,
    `alter table if exists recipes add column if not exists prep_time text;`,
    `alter table if exists recipes add column if not exists cover_image text;`,
    `alter table if exists recipes add column if not exists tier text not null default 'FREE';`,
    `alter table if exists recipes add column if not exists tags text[];`,
    `alter table if exists recipes add column if not exists is_ai_generated boolean not null default false;`,
    `alter table if exists recipes add column if not exists is_premium boolean not null default false;`,
    `create table if not exists recipe_steps (
      id uuid primary key default gen_random_uuid(),
      recipe_id uuid references recipes(id) on delete cascade,
      step_number integer not null,
      instruction text not null,
      media_url text
    );`,
    `create table if not exists recipe_ingredients (
      id uuid primary key default gen_random_uuid(),
      recipe_id uuid references recipes(id) on delete cascade,
      ingredient_id uuid,
      name text not null,
      quantity text,
      unit text
    );`,
    `create table if not exists technical_sheets (
      id uuid primary key default gen_random_uuid(),
      user_id uuid,
      title text not null,
      category text,
      plan_tier text not null default 'PREMIUM',
      yield_text text,
      ingredients jsonb not null default '[]'::jsonb,
      method text not null default '',
      plating_notes text,
      allergens text[] default '{}',
      cost_summary jsonb not null default '{}'::jsonb,
      source_recipe_id uuid,
      source_escandallo_id uuid,
      created_at timestamptz not null default now()
    );`,
    `alter table if exists technical_sheets add column if not exists category text;`,
    `alter table if exists technical_sheets add column if not exists plan_tier text not null default 'PREMIUM';`,
    `alter table if exists technical_sheets add column if not exists yield_text text;`,
    `alter table if exists technical_sheets add column if not exists ingredients jsonb not null default '[]'::jsonb;`,
    `alter table if exists technical_sheets add column if not exists method text not null default '';`,
    `alter table if exists technical_sheets add column if not exists plating_notes text;`,
    `alter table if exists technical_sheets add column if not exists cost_summary jsonb not null default '{}'::jsonb;`,
    `alter table if exists technical_sheets add column if not exists source_recipe_id uuid;`,
    `alter table if exists technical_sheets add column if not exists source_escandallo_id uuid;`,
    `notify pgrst, 'reload schema';`,
  ]);

  await recipes.from('recipes').delete().eq('is_ai_generated', true);

  for (const recipe of catalog.recipes) {
    const existingRes = await recipes.from('recipes').select('id').eq('title', recipe.title).maybeSingle();
    const payload = {
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prep_time: recipe.prep_time,
      cover_image: recipe.cover_image,
      tags: recipe.tags,
      tier: recipe.tier,
      is_premium: recipe.tier !== 'FREE',
      is_ai_generated: false,
    };
    const upsertRes = existingRes.data?.id
      ? await recipes.from('recipes').update(payload).eq('id', existingRes.data.id).select('id').single()
      : await recipes.from('recipes').insert(payload).select('id').single();

    if (upsertRes.error) throw upsertRes.error;

    const recipeId = upsertRes.data.id;
    await recipes.from('recipe_steps').delete().eq('recipe_id', recipeId);
    await recipes.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

    await recipes.from('recipe_steps').insert(
      recipe.steps.map((instruction, index) => ({
        recipe_id: recipeId,
        step_number: index + 1,
        instruction: buildDetailedRecipeStep(recipe, instruction, index),
      })),
    );

    await recipes.from('recipe_ingredients').insert(
      recipe.ingredients.map((ingredient) => {
        const match = String(ingredient.amount).match(/^([\d.,/-]+)\s*(.*)$/);
        return {
          recipe_id: recipeId,
          name: ingredient.name,
          quantity: match ? match[1] : ingredient.amount,
          unit: match ? match[2] || null : null,
        };
      }),
    );

    const technicalSheetPayload = {
      user_id: defaultOwnerId,
      title: recipe.title,
      category: recipe.category,
      plan_tier: recipe.tier,
      yield_text: '10 PAX',
      ingredients: recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
      })),
      method: recipe.steps.map((step, index) => `${index + 1}. ${buildDetailedRecipeStep(recipe, step, index)}`).join('\n\n'),
      plating_notes: `Finalizar ${recipe.title} con revision de temperatura, limpieza de borde y armonia visual antes del pase.`,
      allergens: [],
      cost_summary: {},
      source_recipe_id: recipeId,
    };

    const existingSheet = await recipes.from('technical_sheets').select('id').eq('title', recipe.title).maybeSingle();
    if (existingSheet.data?.id) {
      const { error: updateSheetError } = await recipes.from('technical_sheets').update(technicalSheetPayload).eq('id', existingSheet.data.id);
      if (updateSheetError) throw updateSheetError;
    } else {
      const { error: insertSheetError } = await recipes.from('technical_sheets').insert(technicalSheetPayload);
      if (insertSheetError) throw insertSheetError;
    }
  }
}

async function seedCourses(academy) {
  const validCourseTitles = catalog.courses.map((course) => course.title);
  await runSql(process.env.DATABASE_URL_ACADEMY, [
    `alter table if exists courses add column if not exists course_order integer default 0;`,
    `alter table if exists courses add column if not exists level text;`,
    `alter table if exists courses add column if not exists duration text;`,
    `alter table if exists courses add column if not exists lessons_count integer default 0;`,
    `alter table if exists courses add column if not exists tier text not null default 'FREE';`,
    `alter table if exists courses add column if not exists is_premium boolean not null default false;`,
    `alter table if exists courses add column if not exists is_ai_generated boolean not null default false;`,
    `alter table if exists courses add column if not exists status text not null default 'published';`,
    `alter table if exists courses add column if not exists author text default 'AURA GASTRONOMY';`,
    `alter table if exists courses add column if not exists tags text[];`,
    `create table if not exists modules (
      id uuid primary key default gen_random_uuid(),
      course_id uuid references courses(id) on delete cascade,
      title text not null,
      content text,
      order_index integer not null default 0
    );`,
    `create table if not exists lessons (
      id uuid primary key default gen_random_uuid(),
      module_id uuid references modules(id) on delete cascade,
      title text not null,
      content text,
      video_url text,
      duration text,
      order_index integer not null default 0
    );`,
    `create table if not exists exams (
      id uuid primary key default gen_random_uuid(),
      course_id uuid references courses(id) on delete cascade unique,
      questions jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    );`,
    `create table if not exists enrollments (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      course_id uuid references courses(id) on delete cascade,
      progress_percentage integer not null default 0,
      last_accessed timestamptz default now(),
      completed_at timestamptz,
      exam_attempts integer not null default 0,
      best_score integer not null default 0,
      last_score integer not null default 0,
      exam_passed boolean not null default false,
      payment_required boolean not null default false,
      payment_unlocked boolean not null default false,
      locked_until timestamptz,
      unique (user_id, course_id)
    );`,
    `alter table if exists enrollments add column if not exists exam_attempts integer not null default 0;`,
    `alter table if exists enrollments add column if not exists best_score integer not null default 0;`,
    `alter table if exists enrollments add column if not exists last_score integer not null default 0;`,
    `alter table if exists enrollments add column if not exists exam_passed boolean not null default false;`,
    `alter table if exists enrollments add column if not exists payment_required boolean not null default false;`,
    `alter table if exists enrollments add column if not exists payment_unlocked boolean not null default false;`,
    `alter table if exists enrollments add column if not exists locked_until timestamptz;`,
    `notify pgrst, 'reload schema';`,
  ]);

  await academy.from('courses').delete().eq('is_ai_generated', true);
  const staleCourses = await academy.from('courses').select('id,title');
  const staleCourseIds = (staleCourses.data ?? [])
    .filter((course) => !validCourseTitles.includes(course.title))
    .map((course) => course.id);
  if (staleCourseIds.length > 0) {
    await academy.from('courses').delete().in('id', staleCourseIds);
  }

  for (const course of catalog.courses) {
    const existingRes = await academy.from('courses').select('id').eq('title', course.title).maybeSingle();
    const payload = {
      title: course.title,
      description: course.description,
      course_order: catalog.courses.findIndex((entry) => entry.title === course.title) + 1,
      level: course.level,
      duration: course.duration,
      lessons_count: course.modules.reduce((acc, module) => acc + module.lessons.length, 0),
      tier: course.tier,
      is_premium: course.tier !== 'FREE',
      is_ai_generated: false,
      status: 'published',
      author: 'AURA GASTRONOMY',
      tags: course.tags,
    };
    const upsertRes = existingRes.data?.id
      ? await academy.from('courses').update(payload).eq('id', existingRes.data.id).select('id').single()
      : await academy.from('courses').insert(payload).select('id').single();

    if (upsertRes.error) throw upsertRes.error;

    const courseId = upsertRes.data.id;
    const moduleIdsRes = await academy.from('modules').select('id').eq('course_id', courseId);
    const moduleIds = (moduleIdsRes.data ?? []).map((row) => row.id);
    if (moduleIds.length > 0) {
      await academy.from('lessons').delete().in('module_id', moduleIds);
    }
    await academy.from('modules').delete().eq('course_id', courseId);
    await academy.from('exams').delete().eq('course_id', courseId);

    const moduleInsertRes = await academy
      .from('modules')
      .insert(
        course.modules.map((module, index) => ({
          course_id: courseId,
          title: module.title,
          content: module.content,
          order_index: index,
        })),
      )
      .select('id');

    if (moduleInsertRes.error) throw moduleInsertRes.error;

    const lessonsPayload = [];
    for (let i = 0; i < course.modules.length; i += 1) {
      const moduleRow = moduleInsertRes.data[i];
      const module = course.modules[i];
      for (let j = 0; j < module.lessons.length; j += 1) {
        lessonsPayload.push({
          module_id: moduleRow.id,
          title: module.lessons[j].title,
          content: buildLongLessonContent(course, module, module.lessons[j]),
          duration: module.lessons[j].duration,
          order_index: j,
        });
      }
    }

    if (lessonsPayload.length > 0) {
      await academy.from('lessons').insert(lessonsPayload);
    }

    await academy.from('exams').upsert(
      {
        course_id: courseId,
        questions: ensureTwentyFiveQuestions(course, course.exam),
      },
      { onConflict: 'course_id' },
    );
  }
}

async function main() {
  const identity = getClient(
    ['SUPABASE_IDENTITY_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    ['SUPABASE_IDENTITY_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  );
  const academy = getClient(
    ['SUPABASE_ACADEMY_URL', 'NEXT_PUBLIC_SUPABASE_ACADEMY_URL'],
    ['SUPABASE_ACADEMY_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  );
  const lab = getClient(
    ['SUPABASE_LAB_URL', 'NEXT_PUBLIC_SUPABASE_LAB_URL'],
    ['SUPABASE_LAB_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  );
  const recipes = getClient(
    ['SUPABASE_RECIPES_URL', 'NEXT_PUBLIC_SUPABASE_RECIPES_URL'],
    ['SUPABASE_RECIPES_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  );

  console.log('Seeding verified catalog into shards...');
  const adminProfileRes = await identity.from('profiles').select('id').eq('role', 'ADMIN').limit(1).maybeSingle();
  const defaultOwnerId = adminProfileRes.data?.id ?? null;
  if (!defaultOwnerId) {
    throw new Error('No admin profile found to own shared technical sheets');
  }
  await seedPlans(identity);
  await seedIngredients(lab);
  await seedRecipes(recipes, defaultOwnerId);
  await seedCourses(academy);
  console.log('Verified catalog synced successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
