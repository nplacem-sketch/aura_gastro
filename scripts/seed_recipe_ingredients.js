/**
 * seed_recipe_ingredients.js
 * Popula la tabla recipe_ingredients con ingredientes reales para cada receta,
 * extrayendo los datos del campo `ingredients` de la tabla recipes o generándolos
 * con Ollama si no existen.
 */
'use strict';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const rDb = createClient(
  process.env.SUPABASE_RECIPES_URL,
  process.env.SUPABASE_RECIPES_SERVICE_KEY
);

const OLLAMA = 'http://127.0.0.1:11434';
const MODEL  = 'qwen2.5:7b';
const delay  = ms => new Promise(r => setTimeout(r, ms));

async function getIngredients(recipe) {
  // Pedir a Ollama ingredientes REALES para esta receta
  const prompt = `Eres un chef profesional. Para la receta "${recipe.title}", proporciona una lista de ingredientes REALES y EXACTOS con cantidades precisas.

REGLAS ABSOLUTAS:
- Lista entre 6 y 12 ingredientes reales de una receta profesional de "${recipe.title}".
- Usa nombres culinarios correctos en español, cantidades numéricas y unidades estándar (g, ml, ud, cdas).
- NO inventes ingredientes absurdos ni fuera de contexto culinario.
- NO repitas ingredientes.

Devuelve SOLO este JSON:
{"ingredients": [{"name": "nombre", "quantity": "cantidad_numerica", "unit": "unidad"}]}`;

  try {
    const res = await fetch(`${OLLAMA}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.1, num_predict: 512 }
      })
    });
    const body = await res.json();
    let raw = (body.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) raw = raw.slice(start, end + 1);
    const parsed = JSON.parse(raw);
    if (parsed.ingredients && Array.isArray(parsed.ingredients)) return parsed.ingredients;
  } catch (e) {
    console.log(`  [Ollama error] ${e.message}`);
  }
  return [];
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  AURA — Recipe Ingredients Seeder (Ollama)        ');
  console.log('═══════════════════════════════════════════════════\n');

  const { data: recipes, error } = await rDb.from('recipes').select('id,title').order('title');
  if (error) { console.error('Error fetching recipes:', error.message); return; }
  console.log(`Found ${recipes.length} recipes. Processing...\n`);

  let fixed = 0, skipped = 0;

  for (const recipe of recipes) {
    // Check if already has ingredients
    const { data: existing } = await rDb.from('recipe_ingredients').select('id').eq('recipe_id', recipe.id).limit(1);
    if (existing && existing.length > 0) {
      process.stdout.write(`  ⏭  "${recipe.title}" — ya tiene ingredientes\n`);
      skipped++;
      continue;
    }

    process.stdout.write(`  🥘 "${recipe.title}" … `);
    const ingredients = await getIngredients(recipe);

    if (!ingredients.length) {
      console.log('❌ no se generaron ingredientes');
      continue;
    }

    const rows = ingredients.map(ing => ({
      recipe_id: recipe.id,
      name: ing.name || ing.ingredient || String(ing),
      quantity: ing.quantity ? String(ing.quantity) : null,
      unit: ing.unit || null,
    })).filter(r => r.name);

    const { error: insertErr } = await rDb.from('recipe_ingredients').insert(rows);
    if (insertErr) console.log(`❌ ${insertErr.message}`);
    else { console.log(`✓ (${rows.length} ingredientes)`); fixed++; }

    await delay(300);
  }

  console.log(`\n✅ Completado: ${fixed} recetas con ingredientes, ${skipped} omitidas.\n`);
}

main().catch(console.error);
