const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_LAB_URL, process.env.SUPABASE_LAB_SERVICE_KEY);
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

async function auditIngredients() {
  console.log('--- Iniciando Auditoría Gastronómica ---');
  
  // 1. Fetch ingredients in chunks
  const { data: ingredients, error } = await supabase.from('ingredients').select('id, name');
  if (error) {
    console.error('Error fetching ingredients:', error);
    return;
  }
  
  console.log(`Total ingredientes a revisar: ${ingredients.length}`);
  
  // 2. Process in batches for LLM
  const batchSize = 100;
  const fakeIds = [];
  
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const names = batch.map(ing => ing.name).join(', ');
    
    console.log(`Auditando lote ${Math.floor(i/batchSize) + 1}...`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en botánica, micología y gastronomía técnica. Tu tarea es identificar "ingredientes falsos" o inventados de una lista. Responde SOLAMENTE con una lista separada por comas de los nombres que NO existen realmente o son errores técnicos.'
          },
          {
            role: 'user',
            content: `Revisa estos ingredientes: ${names}`
          }
        ]
      })
    });
    
    const result = await response.json();
    const fakeNames = result.choices[0].message.content.split(',').map(n => n.trim().toLowerCase());
    
    console.log('Fake names identified:', fakeNames);
    
    const matchingIds = batch
      .filter(ing => fakeNames.includes(ing.name.toLowerCase()))
      .map(ing => ing.id);
      
    fakeIds.push(...matchingIds);
  }
  
  // 3. Delete fake ingredients
  if (fakeIds.length > 0) {
    console.log(`Eliminando ${fakeIds.length} ingredientes falsos...`);
    const { error: delError } = await supabase.from('ingredients').delete().in('id', fakeIds);
    if (delError) console.error('Error deleting ingredients:', delError);
    else console.log('Saneo completado con éxito.');
  } else {
    console.log('No se encontraron ingredientes falsos.');
  }
}

auditIngredients();
