const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function getClient(shard) {
  const url = process.env[`SUPABASE_${shard}_URL`];
  const key = process.env[`SUPABASE_${shard}_SERVICE_KEY`];
  if (!url || !key) {
    if (shard === 'IDENTITY') {
        const iUrl = process.env.SUPABASE_IDENTITY_URL;
        const iKey = process.env.SUPABASE_IDENTITY_SERVICE_KEY;
        if(iUrl && iKey) return createClient(iUrl, iKey);
    }
    console.warn(`Shard ${shard} not fully configured in .env.local`);
    return null;
  }
  return createClient(url, key);
}

const shards = {
  identity: getClient('IDENTITY'),
  academy: getClient('ACADEMY'),
  lab: getClient('LAB'),
  recipes: getClient('RECIPES'),
  marketing: getClient('MARKETING'),
  realtime: getClient('REALTIME'),
  botfarm: getClient('BOTFARM'),
};

async function seed() {
  console.log('--- SEEDING AURA GASTRONOMY MASTER SHARDS ---');

  // 1. IDENTITY: Plans
  if (shards.identity) {
    console.log('Seeding Identity: Plans...');
    const { error } = await shards.identity.from('plans').upsert([
      { name: 'FREE', price_monthly_eur: 0, price_annual_eur: 0, features: { courses_limit: 1, ai_access: false, lab_access: false } },
      { name: 'PRO', price_monthly_eur: 39, price_annual_eur: 398, features: { courses_limit: 5, ai_access: false, lab_access: true } },
      { name: 'PREMIUM', price_monthly_eur: 69, price_annual_eur: 662, features: { courses_limit: null, ai_access: true, lab_access: true } },
      { name: 'ENTERPRISE', price_monthly_eur: 149, price_annual_eur: 1341, features: { courses_limit: null, ai_access: true, lab_access: true, bot_access: true } },
    ], { onConflict: 'name' });
    if (error) console.error('Identity error:', error.message);
  }

  // 2. ACADEMY: Courses
  if (shards.academy) {
    console.log('Seeding Academy: Courses...');
    const { error } = await shards.academy.from('courses').upsert([
      { title: 'Master en Fermentación Avanzada', description: 'Exploración científica de Koji, Kombucha y Miso en alta cocina.', level: 'Chef Elite', tier: 'PREMIUM', is_premium: true, image_url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1000', duration: '12h 30m', lessons_count: 15 },
      { title: 'Texturas y Espumas Moleculares', description: 'Dominio de hidrocoloides: Agar-Agar, Alginato y Lecitina.', level: 'Intermedio', tier: 'FREE', is_premium: false, image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000', duration: '5h 45m', lessons_count: 8 },
      { title: 'Creatividad Gastronómica con IA', description: 'Uso de modelos generativos para el diseño de menús conceptuales.', level: 'Chef', tier: 'PRO', is_premium: true, image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000', duration: '8h 20m', lessons_count: 10 },
    ], { onConflict: 'title' });
    if (error) console.error('Academy error:', error.message);
  }

  // 3. LAB: Ingredients
  if (shards.lab) {
    console.log('Seeding Lab: Ingredients...');
    const { error } = await shards.lab.from('ingredients').upsert([
      { name: 'Agar-Agar', category: 'TEXTURIZANTE', scientific_name: 'Gelidium amansii', culinary_notes: 'Gelificante termo-reversible ideal para gelatinas calientes.', origin_region: 'Japón', best_season: ['Todo el año'], is_premium: false },
      { name: 'Alginato de Sodio', category: 'TEXTURIZANTE', scientific_name: 'Phaeophyceae extract', culinary_notes: 'Base para la esferificación. Reacciona con calcio.', origin_region: 'Océanos Atlántico y Pacífico', best_season: ['Todo el año'], is_premium: true },
      { name: 'Goma Xantana', category: 'ESTABILIZANTE', scientific_name: 'Xanthomonas campestris', culinary_notes: 'Espesante potente que no altera el sabor ni el color.', origin_region: 'Maíz fermentado', best_season: ['Todo el año'], is_premium: true },
    ], { onConflict: 'name' });
    if (error) console.error('Lab error:', error.message);
  }

  // 4. RECIPES: Recipes
  if (shards.recipes) {
    console.log('Seeding Recipes: Recipes...');
    const { error } = await shards.recipes.from('recipes').upsert([
      { 
        title: 'Aire de Remolacha y Jengibre', 
        description: 'Una nube etérea con equilibrio terroso y picante.', 
        difficulty: 'Básico', 
        tier: 'FREE', 
        is_premium: false, 
        cover_image: 'https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=1000',
        prep_time: '15 min',
        steps: [
          { step_number: 1, instruction: 'Licuar la remolacha con el jengibre fresco.' },
          { step_number: 2, instruction: 'Añadir lecitina de soja y batir en la superficie para crear el aire.' }
        ]
      },
      { 
        title: 'Esferas de Guisante Líquido', 
        description: 'Explosión de sabor vegetal con técnica de esferificación inversa.', 
        difficulty: 'Avanzado', 
        tier: 'PREMIUM', 
        is_premium: true, 
        cover_image: 'https://images.unsplash.com/photo-1629983422633-1466094b9176?q=80&w=1000',
        prep_time: '45 min',
        steps: [
          { step_number: 1, instruction: 'Preparar el baño de alginato.' },
          { step_number: 2, instruction: 'Congelar el puré de guisante en semiesferas.' },
          { step_number: 3, instruction: 'Sumergir en el baño de alginato durante 3 minutos.' }
        ]
      },
      { 
        title: 'Nieve de Foie Gras', 
        description: 'Textura ultracongelada con rallador microplane sobre manzana ácida.', 
        difficulty: 'Medio', 
        tier: 'PRO', 
        is_premium: true, 
        cover_image: 'https://images.unsplash.com/photo-1601314167099-232775b3d6fd?q=80&w=1000',
        prep_time: '20 min',
        steps: [
          { step_number: 1, instruction: 'Congelar el foie gras a -20°C.' },
          { step_number: 2, instruction: 'Rallar finamente sobre la base de manzana justo antes de servir.' }
        ]
      },
    ], { onConflict: 'title' });
    if (error) console.error('Recipes error:', error.message);
  }

  console.log('--- SEEDING COMPLETE ---');
}

seed();
