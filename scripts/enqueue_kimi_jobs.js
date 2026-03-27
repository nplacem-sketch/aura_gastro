/**
 * Enqueue Kimi/Ollama generation jobs into Supabase BotFarm `generation_queue`.
 *
 * Run:
 *   node scripts/enqueue_kimi_jobs.js
 *
 * Requirements (in .env.local or environment):
 * - SUPABASE_BOTFARM_URL
 * - SUPABASE_BOTFARM_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const BOTFARM_URL = process.env.SUPABASE_BOTFARM_URL;
const BOTFARM_SVC = process.env.SUPABASE_BOTFARM_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOTFARM_URL) {
  console.error('Missing SUPABASE_BOTFARM_URL');
  process.exit(1);
}
if (!BOTFARM_SVC) {
  console.error('Missing SUPABASE_BOTFARM_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const botfarm = createClient(BOTFARM_URL, BOTFARM_SVC, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const jobs = [
  // ACADEMY / COURSES
  { type: 'course', tier: 'PREMIUM', topic: 'Ingenieria gastronomica: espumas, aires y geles' },
  { type: 'course', tier: 'PRO', topic: 'Cocina al vacio (sous-vide) para restaurante' },

  // RECIPES
  { type: 'recipe', tier: 'PREMIUM', topic: 'Esferificacion inversa de aceituna' },
  { type: 'recipe', tier: 'FREE', topic: 'Salsa holandesa clasica' },

  // LAB / INGREDIENTS
  { type: 'ingredient', tier: 'PREMIUM', topic: 'Metilcelulosa' },
  { type: 'ingredient', tier: 'PRO', topic: 'Goma xantana' },

  // LAB / TECHNIQUES
  { type: 'technique', tier: 'PREMIUM', topic: 'Clarificacion por congelacion' },
  { type: 'technique', tier: 'PRO', topic: 'Emulsion estable con lecitina' },
];

async function main() {
  const rows = jobs.map((j) => ({
    type: j.type,
    topic: j.topic,
    tier: j.tier,
    status: 'pending',
  }));

  const { data, error } = await botfarm.from('generation_queue').insert(rows).select('id,type,topic,tier,status');
  if (error) throw error;

  console.log(`✅ Enqueued ${data?.length ?? 0} jobs`);
  for (const j of data ?? []) {
    console.log(`- ${j.id} ${j.type} (${j.tier}) ${j.topic}`);
  }
}

main().catch((err) => {
  console.error('❌ Enqueue failed:', err.message);
  process.exit(1);
});

