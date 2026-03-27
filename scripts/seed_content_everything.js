const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const shards = {
  ACADEMY: createClient(process.env.NEXT_PUBLIC_SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY),
  LAB: createClient(process.env.NEXT_PUBLIC_SUPABASE_LAB_URL, process.env.SUPABASE_LAB_SERVICE_KEY),
  RECIPES: createClient(process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL, process.env.SUPABASE_RECIPES_SERVICE_KEY),
};

async function seedAcademy() {
  console.log('--- Seeding ACADEMY ---');
  const courses = [
    { title: 'Fundamentos de la Cocina Molecular', level: 'Chef', tier: 'FREE', description: 'Bases científicas de las texturas contemporáneas.' },
    { title: 'Técnicas de Vacío y Baja Temperatura', level: 'Chef Elite', tier: 'PRO', description: 'Precisión térmica aplicada al producto.' },
    { title: 'Ingeniería de Sifones y Espumas', level: 'Master', tier: 'PREMIUM', description: 'Arquitectura de aires y densidades etéreas.' },
    { title: 'Esferificación Avanzada y Encapsulados', level: 'Master', tier: 'PREMIUM', description: 'Geometrías líquidas y membranas de alginato.' },
  ];

  for (const c of courses) {
    const { data: existing } = await shards.ACADEMY.from('courses').select('id').eq('title', c.title).single();
    if (existing) {
        console.log('Course already exists:', c.title);
        continue;
    }
    const { data: course, error } = await shards.ACADEMY.from('courses').insert(c).select().single();
    if (error) console.error('Academy Error:', error.message);
    else {
      console.log('Inserted Course:', course.title);
      // Add a placeholder module
      await shards.ACADEMY.from('modules').upsert({
        course_id: course.id,
        title: 'Módulo 1: Introducción Técnica',
        content: 'Bienvenido al ecosistema Aura. Este módulo explora los fundamentos teóricos...',
        order_index: 0
      }, { onConflict: 'course_id,title' });
    }
  }
}

async function seedRecipes() {
  console.log('--- Seeding RECIPES ---');
  const recipes = [
    { 
        title: 'Risotto de Setas Silvestres y Trufa', 
        description: 'Un clásico refinado con la técnica de emulsión de parmesano.', 
        difficulty: 'Medio', 
        tier: 'PRO', 
        is_premium: true,
        cover_image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=2070&auto=format&fit=crop'
    },
    { 
        title: 'Esfera de Remolacha y Tierra de Cacao', 
        description: 'Contraste telúrico con texturas de vanguardia.', 
        difficulty: 'Experto', 
        tier: 'PREMIUM', 
        is_premium: true,
        cover_image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=2157&auto=format&fit=crop'
    },
    { 
        title: 'Salmón a Baja Temperatura con Aire de Cítricos', 
        description: 'Precisión técnica para una textura nacarada perfecta.', 
        difficulty: 'Avanzado', 
        tier: 'PRO', 
        is_premium: true,
        cover_image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1974&auto=format&fit=crop'
    }
  ];

  for (const r of recipes) {
    const { data: existing } = await shards.RECIPES.from('recipes').select('id').eq('title', r.title).single();
    if (existing) {
        console.log('Recipe already exists:', r.title);
        continue;
    }
    const { error } = await shards.RECIPES.from('recipes').insert(r);
    if (error) console.error('Recipes Error:', error.message);
    else console.log('Inserted Recipe:', r.title);
  }
}

async function main() {
  await seedAcademy();
  await seedRecipes();
  console.log('--- SEEDING COMPLETE ---');
}

main();
