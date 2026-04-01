/**
 * clean_asterisks.js
 * Limpia asteriscos y carácteres extraños en Supabase
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_RECIPES_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\\\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

async function main() {
  console.log('\n🧹 Limpiando asteriscos en propiedades JSON y detalles de fichas técnicas...\n');

  // Limpiar en technical_sheets: ingredients (JSONB), allergens (Array), y otros campos
  const { data: sheets, error: sheetErr } = await db.from('technical_sheets').select('*');
  if (sheetErr) throw sheetErr;

  for (const sheet of sheets) {
    let needsUpdate = false;
    const updatePayload = {};

    // Method (por si acaso quedaron)
    if (sheet.method && typeof sheet.method === 'string') {
      const cleaned = cleanText(sheet.method);
      if (cleaned !== sheet.method) {
        updatePayload.method = cleaned;
        needsUpdate = true;
      }
    }

    // Yield_text
    if (sheet.yield_text && typeof sheet.yield_text === 'string') {
      const cleaned = cleanText(sheet.yield_text);
      if (cleaned !== sheet.yield_text) {
        updatePayload.yield_text = cleaned;
        needsUpdate = true;
      }
    }

    // Plating_notes
    if (sheet.plating_notes && typeof sheet.plating_notes === 'string') {
      const cleaned = cleanText(sheet.plating_notes);
      if (cleaned !== sheet.plating_notes) {
        updatePayload.plating_notes = cleaned;
        needsUpdate = true;
      }
    }

    // Title / category
    if (sheet.title && typeof sheet.title === 'string') {
      const cleaned = cleanText(sheet.title);
      if (cleaned !== sheet.title) {
        updatePayload.title = cleaned;
        needsUpdate = true;
      }
    }
    if (sheet.category && typeof sheet.category === 'string') {
      const cleaned = cleanText(sheet.category);
      if (cleaned !== sheet.category) {
        updatePayload.category = cleaned;
        needsUpdate = true;
      }
    }

    // Ingredients (array of objects jsonb)
    if (sheet.ingredients && Array.isArray(sheet.ingredients)) {
      const newIngredients = sheet.ingredients.map(ing => {
        return {
          ...ing,
          name: cleanText(ing.name),
          quantity: cleanText(ing.quantity),
          unit: cleanText(ing.unit)
        };
      });

      // Simple deep compare
      if (JSON.stringify(newIngredients) !== JSON.stringify(sheet.ingredients)) {
        updatePayload.ingredients = newIngredients;
        needsUpdate = true;
      }
    }

    // Allergens (array of strings)
    if (sheet.allergens && Array.isArray(sheet.allergens)) {
      const newAllergens = sheet.allergens.map(a => cleanText(a));
      if (JSON.stringify(newAllergens) !== JSON.stringify(sheet.allergens)) {
        updatePayload.allergens = newAllergens;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.from('technical_sheets').update(updatePayload).eq('id', sheet.id);
      console.log(`  ✓ Ficha técnica limpiada íntegramente: ${sheet.title || sheet.id}`);
    }
  }

  // Limpiar también `recipe_ingredients`
  const { data: recIngs, error: recIngsErr } = await db.from('recipe_ingredients').select('*');
  if (recIngsErr) throw recIngsErr;

  for (const ing of recIngs) {
    const cleanedName = cleanText(ing.name);
    const cleanedQty = cleanText(ing.quantity);
    const cleanedUnit = cleanText(ing.unit);

    if (cleanedName !== ing.name || cleanedQty !== ing.quantity || cleanedUnit !== ing.unit) {
      await db.from('recipe_ingredients').update({
        name: cleanedName,
        quantity: cleanedQty,
        unit: cleanedUnit
      }).eq('id', ing.id);
      console.log(`  ✓ Ingrediente limpiado: ${cleanedName}`);
    }
  }

  console.log('\n✅ Limpieza de fichas técnicas completada.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
