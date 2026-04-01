/**
 * reseed_lab_final.js
 * Borra el laboratorio actual (tabla ingredients) e importa las entradas de la nueva Biblioteca.
 * Separando correctamente las características como propiedades en 'technical_data'.
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

const FILE_PATH = 'C:\\Users\\Casa\\Downloads\\cursos\\laboratoy\\Biblioteca Maestra de Gastronomía Moderna y Técnicas Culinarias - Curated Briefing - 2026-04-01.md';
const text = fs.readFileSync(FILE_PATH, 'utf8');

const regex = /\*\*(\d+)\\\.\s*(.*?)\*\*\n+([\s\S]*?)(?=\n\*\*(\d+)\\\.\s*|\n\\-{10}|\n\*\*Nota para el experto:|$)/g;

let match;
const items = [];
const uniqueNames = new Set();

while ((match = regex.exec(text)) !== null) {
  let title = match[2].replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  let descRaw = match[3];

  let technical_data = {};
  let culinary_notes = [];

  let cleanedDesc = descRaw.replace(/\\\*/g, '*');
  let segments = cleanedDesc.split(/(?:^|\.\s*)\-\s*\*\*/);

  if (segments[0].trim()) {
      culinary_notes.push(segments[0].replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim());
  }

  for (let i = 1; i < segments.length; i++) {
     let seg = segments[i].trim();
     let matchSeg = seg.match(/^([^:*]+)[:*]+\s*([\s\S]*)/);
     
     if (matchSeg) {
         let key = matchSeg[1].trim().replace(/\*/g, '');
         let val = matchSeg[2].trim().replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ');
         val = val.replace(/^\.\s*/, '');
         
         technical_data[key] = val;
         // Si culinary_notes está vacío, tomamos el primer valor como nota
         if (culinary_notes.length === 0) {
             culinary_notes.push(val);
         }
     } else {
         culinary_notes.push(seg.replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim());
     }
  }

  if (!uniqueNames.has(title)) {
    uniqueNames.add(title);
    items.push({
      name: title,
      culinary_notes: culinary_notes.join('\n\n'),
      category: 'GENERAL',
      technical_data: Object.keys(technical_data).length > 0 ? technical_data : null,
      is_premium: true
    });
  }
}

async function main() {
  console.log(`Encontrados ${items.length} elementos únicos en el Briefing.`);

  console.log('\n🧹 Borrando laboratorio actual (tabla ingredients)...');
  const { error: delErr } = await db.from('ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('Error borrando base de datos:', delErr.message);
    process.exit(1);
  }
  console.log('✓ Laboratorio limpio.');

  console.log(`\n🌱 Inyectando ${items.length} elementos con technical_data...`);
  
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
