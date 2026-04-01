const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

function parseArgs(argv) {
  const args = {
    apply: false,
    wipeFirst: false,
    file: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    if (value === '--wipe-first') args.wipeFirst = true;
    if (value === '--file') args.file = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : null;
  }

  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node scripts/import_manual_recipes.js --file scripts/manual_recipes.template.json',
    '  node scripts/import_manual_recipes.js --file my-recipes.json --apply',
    '  node scripts/import_manual_recipes.js --file my-recipes.json --apply --wipe-first',
    '',
    'Recipe shape:',
    '  {',
    '    "title": "Name",',
    '    "description": "Short summary",',
    '    "tier": "FREE|PRO|PREMIUM",',
    '    "difficulty": "Basico|Intermedio|Avanzado|Maestro",',
    '    "prep_time": "45 min",',
    '    "category": "Principal",',
    '    "cover_image": null,',
    '    "tags": ["tag-1"],',
    '    "ingredients": [{ "name": "Ingredient", "quantity": "100", "unit": "g" }],',
    '    "steps": ["Step 1", "Step 2"]',
    '  }',
  ].join('\n'));
}

function normalizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeTier(value) {
  const tier = normalizeText(value, 'FREE').toUpperCase();
  if (tier === 'FREE' || tier === 'PRO' || tier === 'PREMIUM') return tier;
  return 'PREMIUM';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => normalizeText(entry)).filter(Boolean) : [];
}

function normalizeIngredients(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((ingredient) => ({
      name: normalizeText(ingredient?.name),
      quantity: normalizeText(ingredient?.quantity || '', ''),
      unit: normalizeText(ingredient?.unit || '', ''),
    }))
    .filter((ingredient) => ingredient.name);
}

function normalizeSteps(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((step) => (typeof step === 'string' ? normalizeText(step) : normalizeText(step?.instruction)))
    .filter(Boolean);
}

function normalizeRecipe(rawRecipe) {
  return {
    title: normalizeText(rawRecipe?.title),
    description: normalizeText(rawRecipe?.description || '', ''),
    tier: normalizeTier(rawRecipe?.tier),
    difficulty: normalizeText(rawRecipe?.difficulty || 'Maestro', 'Maestro'),
    prep_time: normalizeText(rawRecipe?.prep_time || '', ''),
    category: normalizeText(rawRecipe?.category || 'Produccion', 'Produccion'),
    cover_image: normalizeText(rawRecipe?.cover_image || '', '') || null,
    tags: normalizeArray(rawRecipe?.tags),
    ingredients: normalizeIngredients(rawRecipe?.ingredients),
    steps: normalizeSteps(rawRecipe?.steps),
    technical_sheet: rawRecipe?.technical_sheet && typeof rawRecipe.technical_sheet === 'object'
      ? rawRecipe.technical_sheet
      : null,
  };
}

function createRecipesClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_RECIPES_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing recipe shard credentials in .env.local');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function wipeRecipeCatalog(db) {
  const { error: sheetError } = await db.from('technical_sheets').delete().not('source_recipe_id', 'is', null);
  if (sheetError) throw sheetError;

  const { error: recipeError } = await db.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (recipeError) throw recipeError;
}

async function upsertRecipe(db, recipe) {
  const existingRes = await db.from('recipes').select('id').eq('title', recipe.title).maybeSingle();
  if (existingRes.error) throw existingRes.error;

  const payload = {
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    difficulty: recipe.difficulty,
    prep_time: recipe.prep_time || null,
    cover_image: recipe.cover_image,
    tier: recipe.tier,
    tags: recipe.tags,
    is_premium: recipe.tier !== 'FREE',
    is_ai_generated: false,
  };

  const upsertRes = existingRes.data?.id
    ? await db.from('recipes').update(payload).eq('id', existingRes.data.id).select('id').single()
    : await db.from('recipes').insert(payload).select('id').single();

  if (upsertRes.error) throw upsertRes.error;

  const recipeId = upsertRes.data.id;

  const { error: deleteIngredientsError } = await db.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  if (deleteIngredientsError) throw deleteIngredientsError;

  const { error: deleteStepsError } = await db.from('recipe_steps').delete().eq('recipe_id', recipeId);
  if (deleteStepsError) throw deleteStepsError;

  if (recipe.ingredients.length > 0) {
    const ingredientRows = recipe.ingredients.map((ingredient) => ({
      recipe_id: recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity || null,
      unit: ingredient.unit || null,
    }));
    const { error: insertIngredientsError } = await db.from('recipe_ingredients').insert(ingredientRows);
    if (insertIngredientsError) throw insertIngredientsError;
  }

  if (recipe.steps.length > 0) {
    const stepRows = recipe.steps.map((instruction, index) => ({
      recipe_id: recipeId,
      step_number: index + 1,
      instruction,
    }));
    const { error: insertStepsError } = await db.from('recipe_steps').insert(stepRows);
    if (insertStepsError) throw insertStepsError;
  }

  if (recipe.technical_sheet) {
    const sheetPayload = {
      title: normalizeText(recipe.technical_sheet.title || recipe.title, recipe.title),
      category: normalizeText(recipe.technical_sheet.category || recipe.category, recipe.category),
      plan_tier: normalizeTier(recipe.technical_sheet.plan_tier || recipe.tier),
      yield_text: normalizeText(recipe.technical_sheet.yield_text || '', '') || null,
      ingredients: Array.isArray(recipe.technical_sheet.ingredients) ? recipe.technical_sheet.ingredients : recipe.ingredients,
      method: normalizeText(recipe.technical_sheet.method || recipe.steps.join('\n\n')),
      plating_notes: normalizeText(recipe.technical_sheet.plating_notes || '', '') || null,
      allergens: normalizeArray(recipe.technical_sheet.allergens),
      cost_summary: recipe.technical_sheet.cost_summary && typeof recipe.technical_sheet.cost_summary === 'object'
        ? recipe.technical_sheet.cost_summary
        : {},
      source_recipe_id: recipeId,
      source_escandallo_id: null,
      user_id: '720b1dca-0259-46ad-a34a-6ca38a16f321', // admin — propietario de catálogo global
    };

    const existingSheetRes = await db.from('technical_sheets').select('id').eq('source_recipe_id', recipeId).maybeSingle();
    if (existingSheetRes.error) throw existingSheetRes.error;

    const sheetRes = existingSheetRes.data?.id
      ? await db.from('technical_sheets').update(sheetPayload).eq('id', existingSheetRes.data.id)
      : await db.from('technical_sheets').insert(sheetPayload);

    if (sheetRes.error) {
      // Si falla por user_id NOT NULL, omitir ficha técnica pero continuar con la receta
      console.warn(`  ⚠  Ficha técnica omitida para "${recipe.title}": ${sheetRes.error.message}`);
    }
  }

  return recipeId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    usage();
    process.exit(1);
  }

  if (!fs.existsSync(args.file)) {
    throw new Error(`Recipe file not found: ${args.file}`);
  }

  const raw = JSON.parse(fs.readFileSync(args.file, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('Recipe file must contain a JSON array.');
  }

  const recipes = raw.map(normalizeRecipe).filter((recipe) => recipe.title);
  if (recipes.length === 0) {
    throw new Error('No valid recipes found in the input file.');
  }

  console.log(JSON.stringify({
    file: args.file,
    recipes: recipes.length,
    wipeFirst: args.wipeFirst,
    apply: args.apply,
    titles: recipes.map((recipe) => recipe.title),
  }, null, 2));

  if (!args.apply) {
    console.log('\nDry run only. Add --apply to write changes.');
    return;
  }

  const db = createRecipesClient();

  if (args.wipeFirst) {
    await wipeRecipeCatalog(db);
  }

  const insertedIds = [];
  for (const recipe of recipes) {
    try {
      const id = await upsertRecipe(db, recipe);
      insertedIds.push(id);
      console.log(`  ✓ ${recipe.title}`);
    } catch (err) {
      console.error(`  ✗ ${recipe.title}: ${err.message}`);
    }
  }

  console.log(JSON.stringify({
    applied: true,
    wipeFirst: args.wipeFirst,
    inserted: insertedIds.length,
    ids: insertedIds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
