require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_RECIPES_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Limpiador agresivo de descripciones y notas
function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\[\/?(b|i|u|h[1-6]|span|div)\]/g, '') // pseudo tags
    .replace(/[*#]/g, '')
    .trim();
}

async function main() {
  console.log('🔄 Iniciando súper limpiador y verificador de Escandallos...');

  // 1. Limpiar recipes
  const { data: recipes } = await db.from('recipes').select('id, description, instructions, pro_tips');
  for (const r of recipes || []) {
    const nwDesc = cleanText(r.description);
    const nwInst = cleanText(r.instructions);
    const nwTips = cleanText(r.pro_tips);
    if (nwDesc !== r.description || nwInst !== r.instructions || nwTips !== r.pro_tips) {
      await db.from('recipes').update({
        description: nwDesc,
        instructions: nwInst,
        pro_tips: nwTips
      }).eq('id', r.id);
    }
  }
  console.log(`✅ Recetas limpiadas de caracteres.`);

  // 2. Limpiar technical_sheets
  const { data: sheets } = await db.from('technical_sheets').select('*');
  for (const s of sheets || []) {
    const nwTitle = cleanText(s.title);
    const nwMethod = cleanText(s.method);
    const nwPlating = cleanText(s.plating_notes);
    const nwYield = cleanText(s.yield_text);
    
    let needsUpdate = false;
    let payload = {};
    if (nwTitle !== s.title) { payload.title = nwTitle; needsUpdate = true; }
    if (nwMethod !== s.method) { payload.method = nwMethod; needsUpdate = true; }
    if (nwPlating !== s.plating_notes) { payload.plating_notes = nwPlating; needsUpdate = true; }
    if (nwYield !== s.yield_text) { payload.yield_text = nwYield; needsUpdate = true; }
    
    // Aquí es donde vaciamos el cost_summary para dejarlo "virgen"
    if (s.cost_summary) {
      // Dejamos un cost summary limpio funcional pero vacío
      payload.cost_summary = {
        total_cost: 0,
        cost_per_serving: 0,
        suggested_price: 0,
        gross_margin: 0,
        ingredients_cost: []
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db.from('technical_sheets').update(payload).eq('id', s.id);
    }
  }
  console.log(`✅ Fichas técnicas limpiadas y espacios de escandallos vaciados.`);

  // 3. Limpiar Escandallos directos
  const { data: escandallos } = await db.from('escandallos').select('*');
  if (escandallos && escandallos.length > 0) {
    for (const e of escandallos) {
      // Vaciaremos items del escandallo
      await db.from('escandallos').update({
        ingredients_cost: [],
        total_recipe_cost: 0,
        cost_per_serving: 0,
        suggested_sale_price: 0,
        target_margin: 70
      }).eq('id', e.id);
    }
    console.log(`✅ Tabla escandallos purgada.`);
  }

  // 4. Asegurar que las recetas tengan todos los ingredientes
  // Solo avisaremos y chequearemos si de verdad hay recetas sin ingredientes
  let missing = 0;
  for (const r of recipes || []) {
    const { data: recipeIng } = await db.from('recipe_ingredients').select('id, name, quantity, unit').eq('recipe_id', r.id);
    if (!recipeIng || recipeIng.length === 0) {
      missing++;
    } else {
      // Clean texts inside ingredients too
      for (const i of recipeIng) {
        const nN = cleanText(i.name);
        if (nN !== i.name) {
          await db.from('recipe_ingredients').update({ name: nN }).eq('id', i.id);
        }
      }
    }
  }
  console.log(`✅ Ingredientes chequeados y limpiados.`);
  if (missing > 0) {
    console.log(`⚠️ Atención: Hay ${missing} recetas que NO tienen ingredientes. Por favor revisa si es correcto.`);
  }

  // Todo Listo
  console.log('🏁 Proceso finalizado.');
}

main().catch(console.error);
