require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_LAB_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_LAB_SERVICE_KEY
);

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\[\/?(b|i|u|h[1-6]|span|div)\]/g, '')
    .replace(/[*#]/g, '')
    .trim();
}

function cleanJSON(obj) {
  if (typeof obj === 'string') return cleanText(obj);
  if (Array.isArray(obj)) return obj.map(cleanJSON);
  if (typeof obj === 'object' && obj !== null) {
    const nw = {};
    for (const [k, v] of Object.entries(obj)) {
      nw[cleanText(k)] = cleanJSON(v);
    }
    return nw;
  }
  return obj;
}

async function main() {
  console.log('🔄 Limpiando caracteres extraños del Laboratorio...');
  
  const { data: ingredients } = await db.from('ingredients').select('id, name, culinary_notes, technical_data, origin_region, best_season');
  for (const item of ingredients || []) {
    let payload = {};
    let update = false;

    const nwName = cleanText(item.name);
    const nwNotes = cleanText(item.culinary_notes);
    const nwData = cleanJSON(item.technical_data);
    const nwOrigin = cleanText(item.origin_region);
    const nwSeason = cleanText(item.best_season);

    if (nwName !== item.name) { payload.name = nwName; update = true; }
    if (nwNotes !== item.culinary_notes) { payload.culinary_notes = nwNotes; update = true; }
    if (nwOrigin !== item.origin_region) { payload.origin_region = nwOrigin; update = true; }
    if (nwSeason !== item.best_season) { payload.best_season = nwSeason; update = true; }
    
    // Deep comparison is tricky, but let's just use stringify:
    if (JSON.stringify(nwData) !== JSON.stringify(item.technical_data)) {
      payload.technical_data = nwData;
      update = true;
    }

    if (update) {
      await db.from('ingredients').update(payload).eq('id', item.id);
    }
  }
  console.log('✅ Laboratorio purgado correctamente.');
}
main().catch(console.error);
