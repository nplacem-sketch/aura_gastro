const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_LAB_URL, process.env.SUPABASE_LAB_SERVICE_KEY);
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function auditStrict() {
  console.log('--- Auditoría de Ultra-Precisión (Skeptic Mode) ---');
  
  const { data: ingredients, error } = await supabase.from('ingredients').select('id, name');
  if (error) return console.error(error);
  
  const batchSize = 30;
  const fakeIds = [];
  
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const names = batch.map(ing => ing.name).join('|');
    
    console.log(`Analizando lote ${Math.floor(i/batchSize) + 1}...`);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `ERES UN EXPERTO GASTRONÓMICO CRÍTICO. Identifica términos que NO SON ingredientes reales, tienen errores tipográficos graves (ej: "de horneara"), son fragmentos de frases o son inventados. Lista: ${names}. Responde SOLO con los términos erróneos separados por comas. Si todo es perfecto responde "NINGUNO".`
            }]
          }]
        })
      });
      
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('  Detectado:', text.trim());
      
      if (text.toUpperCase().includes('NINGUNO') || !text.trim()) continue;
      
      const fakeNames = text.split(',').map(n => n.trim().toLowerCase());
      const matchingIds = batch
        .filter(ing => fakeNames.some(fn => ing.name.toLowerCase().includes(fn) || fn.includes(ing.name.toLowerCase())))
        .map(ing => ing.id);
        
      fakeIds.push(...matchingIds);
    } catch (err) {
      console.error('Error batch:', i, err.message);
    }
  }
  
  if (fakeIds.length > 0) {
    console.log(`Eliminando ${fakeIds.length} elementos detectados.`);
    await supabase.from('ingredients').delete().in('id', fakeIds);
  } else {
    console.log('Base de datos saneada.');
  }
}

auditStrict();
