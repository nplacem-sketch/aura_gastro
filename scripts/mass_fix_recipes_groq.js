const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const rDb = createClient(process.env.SUPABASE_RECIPES_URL, process.env.SUPABASE_RECIPES_SERVICE_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DRIVE_FOLDER = "G:\\\\Mi unidad\\\\LIBROS COCINA";

function getBooks() {
  try {
    const files = fs.readdirSync(DRIVE_FOLDER);
    return files.filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(DRIVE_FOLDER, f));
  } catch (e) {
    console.error("No se pudo leer Google Drive:", e.message);
    return [];
  }
}

function extractText(bookPath) {
  try {
    const outDir = path.join(__dirname, '../.tmp_pdf');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    // Extraemos 8 páginas aleatorias
    const cmd = `python scripts/extract_book_pdf.py --path "${bookPath}" --out-dir "${outDir}" --max-pages 8 --min-text-chars 0`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const json = JSON.parse(result.trim());
    return json.text || "";
  } catch (e) {
    console.error(`Error extrayendo de ${bookPath}:`, e.message);
    return "";
  }
}

async function askGroq(prompt, systemContext = "") {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemContext || "Eres un grandísimo chef de estrellas Michelin. Devuelve el JSON sin formatear con comillas." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (e) {
      console.log(`  [Groq Error] (intento ${attempt}): ${e.message}`);
      if (e.message.includes('Rate limit') || e.message.includes('429')) {
        await new Promise(r => setTimeout(r, 10000));
      } else {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  return null;
}

async function processRecipes() {
  const books = getBooks();
  console.log(`Encontrados ${books.length} libros en G:\\Mi unidad\\LIBROS COCINA`);

  const { data: recipes } = await rDb.from('recipes').select('id, title, tier');
  if (!recipes || recipes.length === 0) return;
  
  for (let c = 0; c < recipes.length; c++) {
    const recipe = recipes[c];
    console.log(`\\n[${c+1}/${recipes.length}] Receta: ${recipe.title} (${recipe.tier})`);
    
    let extractedText = "";
    let attempts = 0;
    while (extractedText.length < 500 && attempts < 3 && books.length > 0) {
      const randomBook = books[Math.floor(Math.random() * books.length)];
      console.log(`  Leyendo contexto de: ${path.basename(randomBook)}`);
      extractedText = extractText(randomBook);
      attempts++;
    }

    const contextText = extractedText.substring(0, 3000);

    const systemPrompt = `
Eres un chef técnico en un restaurante de estrella Michelin (o equivalente a la dificultad ${recipe.tier}).
Te basarás en los principios teóricos del siguiente EXTRACTO BIBLIOGRÁFICO para garantizar el rigor culinario. No copies directo, pero usa el contexto científico para darle autenticidad.
MANDATORIOS:
1. Cantidades precisas (g, ml). Ningún ingrediente inventado.
2. Explicaciones físico-químicas de por qué se hace cada paso (desnaturalización, emulsión, gelatinización). Prohibido soltar "Haz el paso 2". Párrafos larguísimos detallando temperaturas, tiempos, utensilios y sensaciones táctiles/olfativas para juzgar el punto.
3. El último paso de la receta debe ser "MARIDAJE:" elijendo una bebida con su respectiva justificación.

EXTRACTO BIBLIOGRÁFICO:
${contextText || '(Sin extracto)'}
`;

    const userPrompt = `
Genera la receta completa para "${recipe.title}".
Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura:
{
  "prep_time": "ej. 2h 15m",
  "difficulty": "Alta/Media/Baja",
  "description": "Una o dos oraciones presentando la receta",
  "ingredients": [
    { "name": "Nombre exacto", "quantity": "cantidad", "unit": "g" }
  ],
  "steps": [
    "Paso 1 súper extenso y detallando la técnica exacta y base química (mínimo 60 palabras)...",
    "Paso 2...",
    "Paso 3...",
    "MARIDAJE: Nombre del vino y razón..."
  ]
}
`;

    const result = await askGroq(userPrompt, systemPrompt);
    if (result && result.steps && result.ingredients) {
      // Limpiamos los steps y ingredientes viejos
      await rDb.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
      await rDb.from('recipe_steps').delete().eq('recipe_id', recipe.id);

      // Actualizamos receta
      await rDb.from('recipes').update({
        prep_time: result.prep_time,
        difficulty: result.difficulty,
        description: result.description,
        status: 'VERIFIED_UNIT'
      }).eq('id', recipe.id);

      // Metemos ingredientes
      const ingsInserts = result.ingredients.map(ing => ({
        recipe_id: recipe.id,
        name: ing.name,
        quantity: String(ing.quantity || ''),
        unit: ing.unit || '',
        category: 'DEFAULT',
      }));
      await rDb.from('recipe_ingredients').insert(ingsInserts);

      // Metemos pasos
      const stepInserts = result.steps.map((s, idx) => ({
        recipe_id: recipe.id,
        step_number: idx + 1,
        instruction: s
      }));
      await rDb.from('recipe_steps').insert(stepInserts);

      console.log(`  -> Actualizada la receta ${recipe.title} con su estructura RAG. Pasos: ${result.steps.length}`);
    } else {
      console.log(`  -> ERROR: No se devolvió estructura esperada para la receta.`);
    }
    
    await new Promise(r => setTimeout(r, 4000));
  }
}

async function main() {
  console.log('--- GENERADOR DE RECETAS CON GROQ & G-DRIVE ---');
  await processRecipes();
  console.log('--- COMPLETADO ---');
}

main().catch(console.error);
