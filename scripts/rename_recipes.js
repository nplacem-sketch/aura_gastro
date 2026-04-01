/**
 * rename_recipes.js
 * Actualiza los títulos de todas las recetas en Supabase eliminando prefijos de cursos.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_RECIPES_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

function cleanTitle(title) {
  let cleaned = title;

  // Elimina palabras como "MANUAL TÉCNICO", "Recetario Técnico AURA", "Receta Técnica Profesional", etc.
  // Seguidas de "Receta nº X" y un guion o dos puntos
  const prefixRegex = /^(?:manual|protocolo|recetario|receta)[^:]*?:\s*(?:receta\s*(?:n[ºo]\s*)?\d+\s*[-–]\s*)?|^(?:manual|protocolo|recetario|receta)[^:]*?n[ºo]\s*\d+[^:-]*[-:–]\s*/i;
  
  cleaned = cleaned.replace(prefixRegex, '');
  
  // Limpieza adicional si queda "Receta X - " al principio (como en "Manual Técnico de Vanguardia: Receta 15 - Ravioli...")
  cleaned = cleaned.replace(/^receta\s*(?:n[ºo]\s*)?\d+\s*[-–:]\s*/i, '');
  
  // Limpieza si es "Receta nº X | AURA GASTRONOMY:"
  cleaned = cleaned.replace(/^receta\s*(?:n[ºo]\s*)?\d+\s*\|\s*AURA GASTRONOMY:\s*/i, '');

  return cleaned.trim();
}

async function main() {
  console.log('\n🔄 Estandarizando títulos de recetas...\n');

  const { data: recipes, error } = await db.from('recipes').select('id, title');
  if (error) throw error;

  for (const recipe of recipes) {
    const newTitle = cleanTitle(recipe.title);
    
    if (newTitle !== recipe.title) {
      console.log(`  🔧 Renombrando:\n      OLD: "${recipe.title}"\n      NEW: "${newTitle}"`);
      
      const { error: updErr } = await db.from('recipes').update({ title: newTitle }).eq('id', recipe.id);
      if (updErr) console.error(`  ✗ Error recipes: ${updErr.message}`);

      const { error: sheetErr } = await db.from('technical_sheets').update({ title: newTitle }).eq('source_recipe_id', recipe.id);
      if (sheetErr) console.warn(`  ⚠ Error sheets: ${sheetErr.message}`);
    } else {
      console.log(`  ✓ Correcto: "${recipe.title}"`);
    }
  }

  console.log('\n✅ Títulos estandarizados.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
