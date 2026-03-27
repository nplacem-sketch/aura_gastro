/**
 * Remove duplicated data from Supabase CORE after migrating to shards.
 *
 * This deletes rows from CORE tables that now live in other Supabase projects.
 *
 * Safe by default: dry-run unless `--apply` is provided.
 *
 * Requires:
 * - DATABASE_URL_CORE in .env.local
 *
 * Run:
 *   node scripts/prune_core_sharded_tables.js
 *   node scripts/prune_core_sharded_tables.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = require('pg');
const { parse } = require('pg-connection-string');

const argv = new Set(process.argv.slice(2));
const APPLY = argv.has('--apply');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function pgClient(connectionString) {
  const p = parse(connectionString);
  return new Client({
    host: p.host,
    port: p.port,
    database: p.database,
    user: p.user,
    password: p.password,
    ssl: { rejectUnauthorized: false },
  });
}

async function countTable(core, table) {
  const res = await core.query(`select count(*)::int as n from ${table}`);
  return res.rows[0]?.n ?? 0;
}

async function main() {
  const core = pgClient(requireEnv('DATABASE_URL_CORE'));
  await core.connect();

  // Order matters to avoid FK violations (children first).
  const deleteOrder = [
    // Recipes
    'recipe_steps',
    'recipe_ingredients',
    'recipes',

    // Academy
    'lessons',
    'modules',
    'enrollments',
    'courses',

    // Lab
    'ingredient_properties',
    'ingredients',
    'techniques',

    // Realtime/chat
    'messages',
    'room_participants',
    'chat_rooms',

    // Marketing
    'published_posts',
    'marketing_tasks',
    'seo_monitor',

    // Botfarm
    'generation_queue',
    'knowledge_base',
  ];

  try {
    console.log(`Mode: ${APPLY ? 'APPLY (deleting from CORE)' : 'DRY-RUN (no changes)'}`);

    const before = {};
    for (const t of deleteOrder) before[t] = await countTable(core, t);
    console.log('CORE counts before:', before);

    if (!APPLY) {
      console.log('No changes applied. Re-run with --apply to delete from CORE.');
      return;
    }

    await core.query('begin');
    try {
      for (const t of deleteOrder) {
        await core.query(`delete from ${t}`);
      }
      await core.query('commit');
    } catch (e) {
      await core.query('rollback');
      throw e;
    }

    const after = {};
    for (const t of deleteOrder) after[t] = await countTable(core, t);
    console.log('CORE counts after:', after);

    console.log('✅ CORE pruned (sharded tables emptied)');
  } finally {
    await core.end();
  }
}

main().catch((err) => {
  console.error('❌ Prune failed:', err.message);
  process.exit(1);
});

