const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_LAB_URL, process.env.SUPABASE_LAB_SERVICE_KEY);
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

async function askOllama(system, user) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content ?? '';
}

async function auditIngredients() {
  console.log('--- Iniciando auditoria gastronomica con Ollama ---');

  const { data: ingredients, error } = await supabase.from('ingredients').select('id, name');
  if (error) {
    console.error('Error fetching ingredients:', error);
    return;
  }

  console.log(`Total ingredientes a revisar: ${ingredients.length}`);

  const batchSize = 100;
  const fakeIds = [];

  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const names = batch.map((ingredient) => ingredient.name).join(', ');

    console.log(`Auditando lote ${Math.floor(i / batchSize) + 1}...`);

    const content = await askOllama(
      'Eres un experto en botanica, micologia y gastronomia tecnica. Responde solo con una lista separada por comas de nombres que no existen realmente o son errores tecnicos.',
      `Revisa estos ingredientes: ${names}`,
    );

    const fakeNames = content
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    console.log('Fake names identified:', fakeNames);

    const matchingIds = batch
      .filter((ingredient) => fakeNames.includes(String(ingredient.name || '').toLowerCase()))
      .map((ingredient) => ingredient.id);

    fakeIds.push(...matchingIds);
  }

  if (fakeIds.length > 0) {
    console.log(`Eliminando ${fakeIds.length} ingredientes falsos...`);
    const { error: deleteError } = await supabase.from('ingredients').delete().in('id', fakeIds);
    if (deleteError) {
      console.error('Error deleting ingredients:', deleteError);
      return;
    }

    console.log('Saneo completado con exito.');
    return;
  }

  console.log('No se encontraron ingredientes falsos.');
}

auditIngredients().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
