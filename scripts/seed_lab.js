const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl =
  process.env.SUPABASE_LAB_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_LAB_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSvc =
  process.env.SUPABASE_LAB_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing SUPABASE_LAB_URL (or NEXT_PUBLIC_SUPABASE_URL).');
  process.exit(1);
}
if (!supabaseSvc) {
  console.error('Missing SUPABASE_LAB_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSvc, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ingredients = [
  {
    name: 'Alginato de Sodio',
    category: 'TEXTURIZANTE',
    description: 'Polisacárido natural extraído de algas pardas. Esencial para la técnica de esferificación básica e inversa.',
    origin: 'Algas Pardas (Laminaria)',
    optimal_temp: '80°C (Solubilidad)',
    properties: { 'Viscosidad': 'Media-Alta', 'Reactividad': 'Gelifía con Calcio', 'Hidratación': 'En Frío' }
  },
  {
    name: 'Lecitina de Soja',
    category: 'EMULSIFICANTE',
    description: 'Fosfolípido extraído del grano de soja. Permite la creación de aires y espumas ligeras o "aires de sabor".',
    origin: 'Grano de Soja',
    optimal_temp: '30-40°C',
    properties: { 'Poder Aireante': 'Máximo', 'Solubilidad': 'Dispersable en Agua y Grasas', 'Formato': 'Polvo Fino' }
  },
  {
    name: 'Agar-Agar',
    category: 'TEXTURIZANTE',
    description: 'Gelificante de origen vegetal extraído de algas rojas. Permite crear gelatinas calientes que no se funden a 80°C.',
    origin: 'Algas Rojas (Gelidium)',
    optimal_temp: '85-90°C (Ebullición)',
    properties: { 'Textura': 'Dura y Quebradiza', 'Punto de Gel': '32-45°C', 'Reversibilidad': 'Termo-reversible' }
  },
  {
    name: 'Goma Xantana',
    category: 'ESTABILIZANTE',
    description: 'Polisacárido producido por la fermentación de la bacteria Xanthomonas campestris. Espesante en frío y calor.',
    origin: 'Fermentación Bacteriana',
    optimal_temp: 'Cualquier temperatura',
    properties: { 'Pseudo-plasticidad': 'Muy Alta', 'Resistencia': 'Ph y Salinidad', 'Transparencia': 'Excelente' }
  }
];

async function seed() {
  console.log('Seeding Lab DB via Supabase JS...');
  const { data, error } = await supabase.from('ingredients').upsert(ingredients, { onConflict: 'name' });
  if (error) console.error('Error seeding:', error.message);
  else console.log('Seeded molecular ingredients successfully.');
}

seed();
