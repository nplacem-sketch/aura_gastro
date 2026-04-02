/**
 * clean_all_recipes.js
 * Limpia todos los caracteres de escape (\*, \_, etc.) en TODAS las tablas de recetas en Supabase
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_RECIPES_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\\\*/g, '')      // eliminar \*
    .replace(/\\_/g, '')        // eliminar \_
    .replace(/\*\*/g, '')       // eliminar **
    .replace(/\*/g, '')         // eliminar *
    .replace(/\\#/g, '')        // eliminar \#
    .trim();
}

function cleanJsonArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    if (typeof item === 'string') {
      return cleanText(item);
    }
    if (typeof item === 'object' && item !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(item)) {
        cleaned[key] = typeof value === 'string' ? cleanText(value) : value;
      }
      return cleaned;
    }
    return item;
  });
}

async function cleanTable(tableName, textFields, jsonFields = []) {
  console.log(`\n🧹 Limpiando tabla: ${tableName}...`);

  const { data: rows, error } = await db.from(tableName).select('*');
  if (error) {
    console.log(`  ⚠️ Error leyendo ${tableName}: ${error.message}`);
    return 0;
  }

  let updatedCount = 0;

  for (const row of rows) {
    let needsUpdate = false;
    const updatePayload = {};

    // Limpiar campos de texto
    for (const field of textFields) {
      if (row[field] && typeof row[field] === 'string') {
        const cleaned = cleanText(row[field]);
        if (cleaned !== row[field]) {
          updatePayload[field] = cleaned;
          needsUpdate = true;
        }
      }
    }

    // Limpiar campos JSON/JSONB
    for (const field of jsonFields) {
      if (row[field]) {
        let cleaned;
        if (Array.isArray(row[field])) {
          cleaned = cleanJsonArray(row[field]);
        } else if (typeof row[field] === 'object') {
          cleaned = {};
          for (const [key, value] of Object.entries(row[field])) {
            cleaned[key] = typeof value === 'string' ? cleanText(value) : value;
          }
        } else {
          continue;
        }

        if (JSON.stringify(cleaned) !== JSON.stringify(row[field])) {
          updatePayload[field] = cleaned;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await db.from(tableName).update(updatePayload).eq('id', row.id);
      updatedCount++;
      console.log(`  ✓ ${tableName}#${row.id} limpiada`);
    }
  }

  console.log(`  ✅ ${updatedCount} registros actualizados en ${tableName}`);
  return updatedCount;
}

async function main() {
  console.log('\n Iniciando limpieza completa de recetas en Supabase...\n');

  let totalUpdated = 0;

  // Tabla: recipes (principal)
  totalUpdated += await cleanTable('recipes',
    ['title', 'description', 'method', 'plating_notes', 'category', 'difficulty', 'steps'],
    ['ingredients']
  );

  // Tabla: recipe_steps
  totalUpdated += await cleanTable('recipe_steps',
    ['instruction'],
    []
  );

  // Tabla: technical_sheets
  totalUpdated += await cleanTable('technical_sheets',
    ['title', 'category', 'method', 'yield_text', 'plating_notes'],
    ['ingredients', 'allergens']
  );

  // Tabla: recipe_ingredients
  totalUpdated += await cleanTable('recipe_ingredients',
    ['name', 'quantity', 'unit'],
    []
  );

  console.log('\n' + '='.repeat(50));
  console.log(`✅ LIMPIEZA COMPLETADA: ${totalUpdated} registros actualizados en total`);
  console.log('='.repeat(50) + '\n');
}

main().catch((e) => {
  console.error('\n❌ Error fatal:', e.message);
  console.error(e.stack);
  process.exit(1);
});
