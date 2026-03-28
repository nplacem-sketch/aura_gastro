/**
 * Seed AURA GASTRONOMY shards with local Ollama and insert into Supabase shards:
 * - LAB: 100 ingredients, 750 techniques
 * - RECIPES: 100 recipes (+ recipe_steps)
 * - ACADEMY: 1 course FREE, 2 courses PRO, 4 courses PREMIUM (+ modules + exams)
 *
 * Requirements (.env.local):
 * - OLLAMA_HOST (default http://localhost:11434)
 * - OLLAMA_MODEL (default gemma3:4b)
 * - SUPABASE_LAB_URL + SUPABASE_LAB_SERVICE_KEY
 * - SUPABASE_RECIPES_URL + SUPABASE_RECIPES_SERVICE_KEY
 * - SUPABASE_ACADEMY_URL + SUPABASE_ACADEMY_SERVICE_KEY
 *
 * Run:
 *   node scripts/kimi_seed_shards.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

const lab = createClient(requireEnv('SUPABASE_LAB_URL'), requireEnv('SUPABASE_LAB_SERVICE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const recipes = createClient(requireEnv('SUPABASE_RECIPES_URL'), requireEnv('SUPABASE_RECIPES_SERVICE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const academy = createClient(requireEnv('SUPABASE_ACADEMY_URL'), requireEnv('SUPABASE_ACADEMY_SERVICE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ollamaChat(system, user) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      // Stream to avoid idle timeouts during long generations.
      stream: true,
      // Enforce valid JSON output from Ollama (reduces parse failures).
      format: 'json',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      options: { temperature: 0.55, top_p: 0.9 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }
  if (!res.body) throw new Error('Ollama response missing body');

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffered = '';
  let content = '';

  // Ollama streaming responses are newline-delimited JSON objects.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true });

    while (true) {
      const nl = buffered.indexOf('\n');
      if (nl === -1) break;
      const line = buffered.slice(0, nl).trim();
      buffered = buffered.slice(nl + 1);
      if (!line) continue;

      let chunk;
      try {
        chunk = JSON.parse(line);
      } catch (e) {
        throw new Error(`Ollama stream parse error: ${e.message}`);
      }

      if (chunk?.message?.content) content += chunk.message.content;
      if (chunk?.done) return content;
    }
  }

  return content;
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    // Try to extract first JSON object/array
    const start = Math.min(
      ...['{', '['].map((c) => {
        const i = s.indexOf(c);
        return i === -1 ? Number.POSITIVE_INFINITY : i;
      }),
    );
    if (!Number.isFinite(start)) throw new Error('No JSON found in model output');
    const trimmed = s.slice(start).trim();
    return JSON.parse(trimmed);
  }
}

function uniqBy(items, getKey) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(getKey(item) ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function withRetry(fn, label, attempts = 3) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`[retry ${i}/${attempts}] ${label}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw lastErr;
}

async function tableCount(client, table) {
  const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function seedIngredients(count = 100) {
  const batch = 15;
  const system = `Eres el especialista del Aura Lab de AURA GASTRONOMY.
Devuelves SOLO JSON valido, sin markdown, sin texto extra. Idioma: español profesional.`;

  let safety = 0;
  while (true) {
    const existing = await tableCount(lab, 'ingredients');
    const remaining = count - existing;
    if (remaining <= 0) {
      console.log(`[lab] ingredients already >= ${count} (current ${existing})`);
      return;
    }

    const n = Math.min(batch, remaining);
    const prompt = `Genera ${n} ingredientes distintos y realistas para una base de datos culinaria.
No repitas nombres.
Devuelve EXACTAMENTE ${n} items.
Responde con items compactos para acelerar.
Devuelve ESTRICTAMENTE:
{
  "items": [
    {
      "name": "Nombre",
      "category": "TEXTURIZANTE|EMULSIFICANTE|ESTABILIZANTE|ESPUMANTE|SABORIZANTE",
      "origin_region": "Origen",
      "culinary_notes": "Notas culinarias (1 frase)"
    }
  ]
}`;

    const jsonText = await withRetry(() => ollamaChat(system, prompt), `ingredients batch ${safety + 1}`, 3);
    const parsed = safeJsonParse(jsonText);
    const items = parsed.items || [];
    const picked = uniqBy(items.slice(0, n).filter((it) => it && it.name), (it) => it.name);

    const rows = picked.map((it) => ({
      name: it.name,
      scientific_name: it.scientific_name ?? null,
      category: it.category ?? 'TEXTURIZANTE',
      origin_region: it.origin_region ?? null,
      best_season: ['Todo el año'],
      culinary_notes: it.culinary_notes ?? '',
      technical_data: it.technical_data ?? {},
      image_url: it.image_url ?? null,
      tier: 'PREMIUM',
      is_premium: true,
    }));

    const { error } = await lab.from('ingredients').upsert(rows, { onConflict: 'name' });
    if (error) throw error;

    const after = await tableCount(lab, 'ingredients');
    console.log(`[lab] ingredients: ${after}/${count} (batch upsert ${rows.length})`);

    safety += 1;
    if (safety > 200) throw new Error('Ingredients seeding safety stop (too many batches)');
  }
}

async function seedTechniques(count = 750) {
  const batch = 30;
  const system = `Eres el instructor tecnico de AURA GASTRONOMY.
Devuelves SOLO JSON valido, sin markdown, sin texto extra. Idioma: español profesional.`;

  let safety = 0;
  while (true) {
    const existing = await tableCount(lab, 'techniques');
    const remaining = count - existing;
    if (remaining <= 0) {
      console.log(`[lab] techniques already >= ${count} (current ${existing})`);
      return;
    }

    const n = Math.min(batch, remaining);
    const prompt = `Genera ${n} tecnicas culinarias distintas (no repitas nombres).
Cada tecnica debe ser util y realista para alta cocina o cocina profesional.
Devuelve EXACTAMENTE ${n} items.
Responde SOLO con nombre y dificultad para acelerar.
Devuelve ESTRICTAMENTE:
{
  "items": [
    {
      "name": "Nombre de la tecnica",
      "difficulty": "Basico|Intermedio|Avanzado|Maestro"
    }
  ]
}`;

    const jsonText = await withRetry(() => ollamaChat(system, prompt), `techniques batch ${safety + 1}`, 3);
    const parsed = safeJsonParse(jsonText);
    const items = parsed.items || [];
    const picked = uniqBy(items.slice(0, n).filter((t) => t && t.name), (t) => t.name);

    const rows = picked.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      difficulty: normalizeTechniqueDifficulty(t.difficulty),
      tier: 'PREMIUM',
      is_premium: true,
    }));

    const { error } = await lab.from('techniques').upsert(rows, { onConflict: 'name' });
    if (error) throw error;

    const after = await tableCount(lab, 'techniques');
    console.log(`[lab] techniques: ${after}/${count} (batch upsert ${rows.length})`);

    safety += 1;
    if (safety > 1000) throw new Error('Techniques seeding safety stop (too many batches)');
  }
}

async function seedRecipes(count = 100) {
  const existing = await tableCount(recipes, 'recipes');
  const target = Math.max(0, count - existing);
  if (target === 0) {
    console.log(`[recipes] recipes already >= ${count} (current ${existing})`);
    return;
  }

  const batch = 6;
  const system = `Eres el redactor jefe de AURA GASTRONOMY.
Devuelves SOLO JSON valido, sin markdown, sin texto extra. Idioma: español profesional.`;

  let created = 0;
  for (let offset = 0; offset < target; offset += batch) {
    const n = Math.min(batch, target - offset);
    const prompt = `Genera ${n} recetas distintas.
Devuelve EXACTAMENTE ${n} items.
Responde compacto para acelerar.
Devuelve ESTRICTAMENTE:
{
  "items": [
    {
      "title": "Titulo",
      "description": "Descripcion corta (1-2 frases)",
      "difficulty": "Basico|Medio|Avanzado|Experto",
      "tags": ["tag1","tag2"],
      "steps": ["Paso 1...", "Paso 2...", "Paso 3...", "Paso 4..."]
    }
  ]
}`;

    const jsonText = await withRetry(() => ollamaChat(system, prompt), `recipes batch ${offset}`, 3);
    const parsed = safeJsonParse(jsonText);
    const items = parsed.items || [];
    const picked = items.slice(0, n).filter((r) => r && (r.title || r.name));

    for (const r of picked) {
      const tier = 'PREMIUM';
      const { data, error } = await recipes
        .from('recipes')
        .insert({
          title: r.title ?? r.name,
          description: r.description ?? '',
          difficulty: normalizeDifficulty(r.difficulty),
          is_premium: tier !== 'FREE',
          is_ai_generated: true,
          tier,
          tags: r.tags ?? [],
        })
        .select('id')
        .single();
      if (error) throw error;

      const steps = Array.isArray(r.steps) ? r.steps : [];
      if (steps.length) {
        const { error: stepErr } = await recipes.from('recipe_steps').insert(
          steps.map((instruction, i) => ({
            recipe_id: data.id,
            step_number: i + 1,
            instruction,
          })),
        );
        if (stepErr) throw stepErr;
      }

      created += 1;
      if (created % 5 === 0 || created === target) {
        console.log(`[recipes] created: ${created}/${target} (target total ${count})`);
      }
    }
  }
}

function normalizeDifficulty(d) {
  const v = String(d || '').toLowerCase();
  if (v.includes('basic')) return 'Básico';
  if (v.includes('medio') || v.includes('inter')) return 'Medio';
  if (v.includes('exper')) return 'Experto';
  if (v.includes('bás') || v.includes('bas')) return 'Básico';
  if (v.includes('ava')) return 'Avanzado';
  return 'Avanzado';
}

function normalizeTechniqueDifficulty(d) {
  const v = String(d || '').toLowerCase();
  if (v.includes('inter') || v.includes('medio')) return 'Intermedio';
  if (v.includes('maes') || v.includes('exper')) return 'Maestro';
  if (v.includes('bás') || v.includes('bas')) return 'Basico';
  if (v.includes('ava')) return 'Avanzado';
  return 'Avanzado';
}

async function seedCourses() {
  const planSet = [
    { tier: 'FREE', count: 1 },
    { tier: 'PRO', count: 2 },
    { tier: 'PREMIUM', count: 4 },
  ];

  const system = `Eres el disenador curricular de AURA GASTRONOMY.
Devuelves SOLO JSON valido, sin markdown, sin texto extra. Idioma: español profesional.`;

  let total = 0;
  for (const g of planSet) {
    const { count: existing, error: countErr } = await academy
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('tier', g.tier);
    if (countErr) throw countErr;

    const missing = Math.max(0, g.count - (existing ?? 0));
    if (missing === 0) {
      console.log(`[academy] courses already OK for ${g.tier} (current ${existing ?? 0})`);
      continue;
    }

    for (let i = 0; i < missing; i++) {
      const prompt = `Crea un curso sobre un tema culinario distinto (no repitas temas). Nivel: ${g.tier}.
Responde compacto para acelerar.
Requisitos:
- EXACTAMENTE 5 modulos
Devuelve JSON ESTRICTO:
{
  "title": "Nombre del Curso",
  "description": "1 parrafo (max 60 palabras)",
  "level": "Basico|Intermedio|Chef|Chef Elite",
  "tags": ["tag1","tag2"],
  "modules": [
    {"name": "Modulo 1", "content": "Contenido (1-2 frases)"}
  ]
}`;

      const jsonText = await withRetry(() => ollamaChat(system, prompt), `course ${g.tier} ${i + 1}`, 3);
      const c = safeJsonParse(jsonText);

      const { data, error } = await academy
        .from('courses')
        .insert({
          title: c.title,
          description: c.description ?? '',
          level: c.level ?? 'Chef',
          tier: g.tier,
          is_premium: g.tier !== 'FREE',
          is_ai_generated: true,
          status: 'published',
          author: 'Equipo AURA GASTRONOMY',
          tags: c.tags ?? [],
        })
        .select('id')
        .single();
      if (error) throw error;

      const modules = Array.isArray(c.modules) ? c.modules : [];
      if (modules.length) {
        const { error: modErr } = await academy.from('modules').insert(
          modules.map((m, idx) => ({
            course_id: data.id,
            title: m.name,
            content: m.content,
            order_index: idx,
          })),
        );
        if (modErr) throw modErr;
      }

      const exam = Array.isArray(c.exam) ? c.exam : [];
      if (exam.length) {
        const { error: examErr } = await academy.from('exams').insert({
          course_id: data.id,
          questions: exam,
        });
        if (examErr) throw examErr;
      }

      total += 1;
      console.log(`[academy] courses created: ${total}/7 (${g.tier})`);
    }
  }
}

async function sanityCheckPermissions() {
  const checks = [
    ['LAB', lab, 'ingredients'],
    ['LAB', lab, 'techniques'],
    ['RECIPES', recipes, 'recipes'],
    ['ACADEMY', academy, 'courses'],
  ];

  for (const [label, client, table] of checks) {
    const res = await client.from(table).select('*').limit(1);
    if (res.error) {
      throw new Error(`${label} permission/schema error on ${table}: ${res.error.message || JSON.stringify(res.error)}`);
    }
  }
}

async function main() {
  console.log(`Ollama: ${OLLAMA_HOST} model=${OLLAMA_MODEL}`);
  await sanityCheckPermissions();

  const ingredientsTarget = Number(process.env.SEED_INGREDIENTS || '100');
  const techniquesTarget = Number(process.env.SEED_TECHNIQUES || '750');
  const recipesTarget = Number(process.env.SEED_RECIPES || '100');

  await seedIngredients(ingredientsTarget);
  await seedTechniques(techniquesTarget);
  await seedRecipes(recipesTarget);
  const seedCoursesEnabled = process.env.SEED_COURSES !== '0';
  if (seedCoursesEnabled) await seedCourses();

  console.log('✅ Done');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
