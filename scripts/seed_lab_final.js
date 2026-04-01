/**
 * seed_lab_final.js
 * Borra el laboratorio actual (tabla ingredients) e importa las entradas de la nueva Biblioteca.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_LAB_URL || process.env.NEXT_PUBLIC_SUPABASE_LAB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSvc = process.env.SUPABASE_LAB_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSvc) {
  console.error('Missing Supabase credentials for Lab database.');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseSvc, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Parsed from local MD
const FILE_PATH = 'C:\\Users\\Casa\\Downloads\\cursos\\laboratoy\\Biblioteca Maestra de Gastronomía Moderna y Técnicas Culinarias - Curated Briefing - 2026-04-01.md';
const text = fs.readFileSync(FILE_PATH, 'utf8');

// The regex captures numbers, titles and description bodies up to the next number or markdown separator
const regex = /\*\*(\d+)\\\.\s*(.*?)\*\*\n+([\s\S]*?)(?=\n\*\*(\d+)\\\.\s*|\n\\-{10}|\n\*\*Nota para el experto:|$)/g;

let match;
const items = [];
const uniqueNames = new Set();

while ((match = regex.exec(text)) !== null) {
  let title = match[2].replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  let descRaw = match[3];

  let desc = descRaw
    .replace(/\\\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/more_horiz/g, '')
    .replace(/\s+/g, ' ')
    .replace(/-\s+/g, '')       // Remove leading hyphens like "-   "
    .replace(/\.\s*-/g, '. ')   // Remove hyphens used as separator like " .- "
    .trim();

  // Handle some duplicated items due to AI repeating blocks in the text
  if (!uniqueNames.has(title)) {
    uniqueNames.add(title);
    items.push({
      name: title,
      description: desc,
      category: 'GENERAL',   // Base category
      properties: {},
      is_premium: true       // Asegurarnos que todo es premium/investigación
    });
  }
}

async function main() {
  console.log(`Encontrados ${items.length} elementos únicos en el Briefing.`);

  // 1. Borrar todos los elementos actuales
  console.log('\n🧹 Borrando laboratorio actual (tabla ingredients)...');
  const { error: delErr } = await db.from('ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('Error borrando base de datos:', delErr.message);
    process.exit(1);
  }
  console.log('✓ Laboratorio limpio.');

  // 2. Insertar elementos nuevos
  console.log(`\n🌱 Inyectando ${items.length} elementos...`);
  
  // Agrupar en batches de 50 para evitar sobrecarga (aunque 100 de golpe suele funcionar)
  const chunkSize = 50;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const { error: insErr } = await db.from('ingredients').insert(chunk);
    if (insErr) {
      console.error(`Error insertando batch ${i}:`, insErr.message);
      process.exit(1);
    }
  }

  console.log('✅ Laboratorio actualizado y sincronizado.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
