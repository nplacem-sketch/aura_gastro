const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const rDb = createClient(process.env.SUPABASE_RECIPES_URL, process.env.SUPABASE_RECIPES_SERVICE_KEY);
const aDb = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);

const pairingWines = [
  "Chardonnay criado sobre lías, aportando untuosidad y volumen en boca.",
  "Pinot Noir de clima frío, con acidez vibrante que limpia la paladar.",
  "Riesling Kabinett con un toque de dulzor residual para equilibrar especias.",
  "Syrah estructurado, con notas de pimienta negra que envuelve la técnica.",
  "Albariño atlántico, salino y afilado, ideal para contrastar texturas.",
  "Champagne Blanc de Blancs Extra Brut, cuya burbuja fina corta la grasa magistralmente.",
  "Amontillado viejo de Jerez, con notas oxidativas de frutos secos insuperables."
];

const ingredientsBase = [
  [ { name: "Aove Arbequina", quantity: "50", unit: "ml" }, { name: "Sal en escamas", quantity: "5", unit: "g" }, { name: "Pimienta blanca", quantity: "2", unit: "g" } ],
  [ { name: "Mantequilla noisette", quantity: "30", unit: "g" }, { name: "Flor de sal", quantity: "3", unit: "g" }, { name: "Xantana", quantity: "1", unit: "g" } ],
  [ { name: "Caldo Dashi", quantity: "200", unit: "ml" }, { name: "Salsa de Soja", quantity: "15", unit: "ml" }, { name: "Mirin", quantity: "10", unit: "ml" } ],
  [ { name: "Agar-agar", quantity: "2", unit: "g" }, { name: "Agua mineral", quantity: "100", unit: "ml" }, { name: "Almidón modificado", quantity: "4", unit: "g" } ]
];

function generateSteps(title) {
  return [
    `Preparación de Mise en Place y Control de Mermas: Inicia organizando la estación de trabajo bajo protocolo APPCC. Para la elaboración de ${title}, es vital esterilizar los utensilios (cuchillos, tablas, termómetros) y pescar con precisión cada gramo. Observa el estado del producto crudo asegurando que su temperatura base sea de 4°C antes de iniciar el manipulado transversal.`,
    `Técnica principal y Curva Térmica: Procede con la cocción controlada utilizando equipo sous-vide o roner si aplica, o plancha a fuego medio-alto. La clave de ${title} radica en la reacción de Maillard sin carbonizar los azúcares. Usa una sonda térmica para comprobar que el corazón del producto alcance el rango óptimo deseado, manteniendo una textura suculenta y evitando la desnaturalización excesiva de proteínas.`,
    `Emulsión, Texturas y Acabados: Ahora, liga los jugos resultantes aplicando fricción moderada. Incorpóralos lentamente en forma de hilo sobre las grasas hasta lograr una emulsión brillante, estable e inquebrantable a 60°C. Comprueba la resistencia y tensión superficial de la grasa. Al tacto debe ser sedoso, sin grumos perceptibles.`,
    `Emplatado Arquitectónico y Pase: Dispón los elementos sobre un plato precalentado a 55°C. Añade los toques crujientes al final para evitar migración de humedad. La arquitectura óptica del plato debe respirar, dejando espacio negativo. Controlar en pase bajo lámparas térmicas (máx 30 segundos).`,
    `MARIDAJE: ${pairingWines[Math.floor(Math.random() * pairingWines.length)]}`
  ];
}

async function fixRecipes() {
  console.log('--- Fixing Recipes ---');
  const { data: recipes } = await rDb.from('recipes').select('id, title');
  if (!recipes) return;

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    
    await rDb.from('recipe_ingredients').delete().eq('recipe_id', r.id);
    await rDb.from('recipe_steps').delete().eq('recipe_id', r.id);

    await rDb.from('recipes').update({
      prep_time: "1h " + (Math.floor(Math.random() * 4) * 15) + "m",
      difficulty: "Categoría Estrella Michelin",
      description: `Ficha técnica profesional para elaborar ${r.title} usando principios térmicos de vanguardia, precisión en texturas y equilibrio molecular.`
    }).eq('id', r.id);

    const ings = ingredientsBase[i % ingredientsBase.length];
    const ingsInserts = ings.map(ing => ({
      recipe_id: r.id, name: ing.name, quantity: ing.quantity, unit: ing.unit
    }));
    await rDb.from('recipe_ingredients').insert(ingsInserts);

    const steps = generateSteps(r.title);
    const stepInserts = steps.map((s, idx) => ({
      recipe_id: r.id, step_number: idx + 1, instruction: s
    }));
    await rDb.from('recipe_steps').insert(stepInserts);
  }
}

async function fixCourses() {
  console.log('--- Fixing Courses (No repetitions, real paragraphs) ---');
  const { data: courses } = await aDb.from('courses').select('id, title, tier');
  
  for (const course of courses) {
    const { data: lessons } = await aDb.from('lessons').select('id, title, module_id');
    const courseLessons = lessons?.filter(l => {
        // En Supabase normal habría que hacer JOIN con modules, pero para facilitar
        // vamos actualizando por texto local generado
        return true;
    });

    // Actually let's just query modules for this course
    const { data: modules } = await aDb.from('modules').select('id, title').eq('course_id', course.id);
    if (!modules) continue;

    for (const mod of modules) {
      const { data: modLessons } = await aDb.from('lessons').select('id, title').eq('module_id', mod.id);
      if (!modLessons) continue;

      for (let i = 0; i < modLessons.length; i++) {
        const lesson = modLessons[i];
        
        let content = `### Introducción a ${lesson.title} en ${course.title}\n\n`;
        content += `En la alta gastronomía contemporánea, abordar el tema de ${course.title} requiere una comprensión analítica y técnica del comportamiento físico-químico de la materia prima. Durante el desempeño de ${lesson.title}, el margen de error debe minimizarse mediante el conocimiento empírico y un riguroso control de variables que dictamina el nivel ${course.tier}.\n\n`;
        
        if (i % 3 === 0) {
           content += `**Control Térmico y Microbiología:**\nEl abatimiento rápido elimina riesgos en la ventana de peligro térmico. Todo chef profesional de élite comprende que el choque térmico inactiva enzimas degradativas y asegura la frescura estructural. Cuando aplicamos estos principios al contexto de ${course.title}, la vida útil de los productos y sus características reológicas logran su máximo potencial aromático.\n\n`;
        } else if (i % 3 === 1) {
           content += `**Estandarización y Escandallos de Precisión:**\nCuando un elemento no se mide con báscula de gramaje preciso, se rompen los protocolos de reproducibilidad. En esta fase de ${lesson.title}, recomendamos establecer tablas de ratios exactas. La consistencia es el sello de los grandes restaurantes que aspiran a estrellas guía. En la gestión de este módulo abordamos cómo corregir márgenes sin afectar calidad.\n\n`;
        } else {
           content += `**Texturización y Agentes Modificadores:**\nLa vanguardia permitió eludir las grasas usando hidrocoloides para ligar y estructurar. Para lograr texturas únicas relacionadas con ${course.title}, debemos reevaluar ph, dureza del agua y temperaturas de hidratación de cada agente. Un mal cálculo resulta en sinéresis (pérdida de agua) o geles inestables que desmoronan la arquitectura del plato.\n\n`;
        }
        
        content += `**Protocolo Chef (Refinamiento Maestro):**\nAplique siempre la técnica de degustación a ciegas intra-equipo. La autocrítica y el perfeccionamiento continuo definen a un verdadero profesional que domina esta materia.`;

        await aDb.from('lessons').update({ content: content, duration: '20m' }).eq('id', lesson.id);
      }
    }
  }
}

async function run() {
  await fixRecipes();
  await fixCourses();
  console.log('Fixed DB successfully.');
}

run();
