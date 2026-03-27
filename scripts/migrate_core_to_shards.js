/**
 * Migrate (copy/merge) data from Supabase CORE Postgres into the separated shard Postgres DBs.
 *
 * Default behavior is SAFE: copies/merges into shards and DOES NOT delete anything from CORE.
 *
 * Requires in .env.local:
 * - DATABASE_URL_CORE
 * - DATABASE_URL_LAB, DATABASE_URL_RECIPES, DATABASE_URL_ACADEMY
 * - DATABASE_URL_BOTFARM, DATABASE_URL_MARKETING, DATABASE_URL_REALTIME
 *
 * Run:
 *   node scripts/migrate_core_to_shards.js
 *   node scripts/migrate_core_to_shards.js --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = require('pg');
const { parse } = require('pg-connection-string');

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has('--dry-run');

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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeTierFromPremium(isPremium) {
  return isPremium ? 'PREMIUM' : 'FREE';
}

function normalizeTechniqueDifficulty(d) {
  const v = String(d || '').toLowerCase();
  if (v.includes('inter') || v.includes('medio')) return 'Intermedio';
  if (v.includes('maes') || v.includes('exper')) return 'Maestro';
  if (v.includes('bás') || v.includes('bas')) return 'Basico';
  if (v.includes('ava')) return 'Avanzado';
  return 'Avanzado';
}

async function fetchAll(src, table) {
  const res = await src.query(`select * from ${table}`);
  return res.rows;
}

function buildInsert(table, columns, conflictCols, updateCols) {
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const conflict = conflictCols?.length ? ` on conflict (${conflictCols.map((c) => `"${c}"`).join(', ')})` : '';
  const update =
    !conflictCols?.length
      ? ''
      : updateCols?.length
        ? ` do update set ${updateCols.map((c) => `"${c}" = excluded."${c}"`).join(', ')}`
        : ' do nothing';
  return { colList, conflict, update };
}

async function upsertBatch(dst, table, rows, columns, conflictCols, updateCols, batchSize = 500) {
  if (!rows.length) return 0;
  const { colList, conflict, update } = buildInsert(table, columns, conflictCols, updateCols);

  let affected = 0;
  for (const part of chunk(rows, batchSize)) {
    const values = [];
    const placeholders = part
      .map((row, rowIndex) => {
        const base = rowIndex * columns.length;
        columns.forEach((c) => values.push(row[c] === undefined ? null : row[c]));
        const p = columns.map((_, colIndex) => `$${base + colIndex + 1}`).join(', ');
        return `(${p})`;
      })
      .join(', ');

    const sql = `insert into ${table} (${colList}) values ${placeholders}${conflict}${update}`;
    if (!DRY_RUN) await dst.query(sql, values);
    affected += part.length;
  }

  return affected;
}

async function migrateLab(core, lab) {
  console.log('\n[LAB] Migrating ingredients, techniques, ingredient_properties...');

  const coreIngredients = await fetchAll(core, 'ingredients');
  const ingRows = coreIngredients.map((r) => ({
    ...r,
    tier: normalizeTierFromPremium(r.is_premium),
  }));

  await upsertBatch(
    lab,
    'ingredients',
    ingRows,
    [
      'id',
      'name',
      'scientific_name',
      'category',
      'origin_region',
      'best_season',
      'technical_data',
      'culinary_notes',
      'image_url',
      'is_premium',
      'created_at',
      'tier',
    ],
    ['name'],
    [
      'scientific_name',
      'category',
      'origin_region',
      'best_season',
      'technical_data',
      'culinary_notes',
      'image_url',
      'is_premium',
      'tier',
    ],
  );

  const destIng = await lab.query(`select id, name from ingredients`);
  const idByName = new Map(destIng.rows.map((x) => [x.name, x.id]));
  const destIdByCoreId = new Map(coreIngredients.map((x) => [x.id, idByName.get(x.name) || null]));

  const coreTechniques = await fetchAll(core, 'techniques');
  const techRows = coreTechniques.map((r) => ({
    ...r,
    tier: normalizeTierFromPremium(r.is_premium),
    difficulty: normalizeTechniqueDifficulty(r.difficulty),
  }));

  await upsertBatch(
    lab,
    'techniques',
    techRows,
    [
      'id',
      'name',
      'description',
      'difficulty',
      'science_basis',
      'equipment_needed',
      'temperature_control',
      'is_premium',
      'created_at',
      'tier',
    ],
    ['name'],
    [
      'description',
      'difficulty',
      'science_basis',
      'equipment_needed',
      'temperature_control',
      'is_premium',
      'tier',
    ],
  );

  const coreProps = await fetchAll(core, 'ingredient_properties');
  const propRows = coreProps
    .map((r) => ({
      id: r.id,
      ingredient_id: destIdByCoreId.get(r.ingredient_id) || r.ingredient_id,
      property_name: r.property_key,
      property_value: r.property_value,
      unit: r.unit,
    }))
    .filter((r) => r.ingredient_id);

  await upsertBatch(
    lab,
    'ingredient_properties',
    propRows,
    ['id', 'ingredient_id', 'property_name', 'property_value', 'unit'],
    ['id'],
    ['ingredient_id', 'property_name', 'property_value', 'unit'],
  );

  console.log(`[LAB] core->lab: ingredients=${coreIngredients.length}, techniques=${coreTechniques.length}, ingredient_properties=${coreProps.length}`);
}

async function migrateRecipes(core, recipes) {
  console.log('\n[RECIPES] Migrating recipes, recipe_steps, recipe_ingredients...');

  const coreRecipes = await fetchAll(core, 'recipes');
  await upsertBatch(
    recipes,
    'recipes',
    coreRecipes,
    [
      'id',
      'user_id',
      'title',
      'description',
      'difficulty',
      'cover_image',
      'is_premium',
      'is_ai_generated',
      'tier',
      'tags',
      'created_at',
    ],
    ['id'],
    [
      'user_id',
      'title',
      'description',
      'difficulty',
      'cover_image',
      'is_premium',
      'is_ai_generated',
      'tier',
      'tags',
    ],
  );

  const coreSteps = await fetchAll(core, 'recipe_steps');
  await upsertBatch(
    recipes,
    'recipe_steps',
    coreSteps,
    ['id', 'recipe_id', 'step_number', 'instruction', 'media_url'],
    ['id'],
    ['recipe_id', 'step_number', 'instruction', 'media_url'],
  );

  const coreRecipeIngredients = await fetchAll(core, 'recipe_ingredients');
  await upsertBatch(
    recipes,
    'recipe_ingredients',
    coreRecipeIngredients,
    ['id', 'recipe_id', 'ingredient_id', 'name', 'quantity', 'unit'],
    ['id'],
    ['recipe_id', 'ingredient_id', 'name', 'quantity', 'unit'],
  );

  console.log(`[RECIPES] core->recipes: recipes=${coreRecipes.length}, steps=${coreSteps.length}, recipe_ingredients=${coreRecipeIngredients.length}`);
}

async function migrateAcademy(core, academy) {
  console.log('\n[ACADEMY] Migrating courses, modules, lessons, enrollments...');

  const coreCourses = await fetchAll(core, 'courses');
  const courseRows = coreCourses.map((r) => ({
    ...r,
    tier: normalizeTierFromPremium(r.is_premium),
  }));

  await upsertBatch(
    academy,
    'courses',
    courseRows,
    [
      'id',
      'title',
      'description',
      'image_url',
      'level',
      'duration',
      'lessons_count',
      'tier',
      'is_premium',
      'is_ai_generated',
      'status',
      'author',
      'tags',
      'created_at',
    ],
    ['id'],
    [
      'title',
      'description',
      'image_url',
      'level',
      'duration',
      'lessons_count',
      'tier',
      'is_premium',
      'is_ai_generated',
      'status',
      'author',
      'tags',
    ],
  );

  const coreModules = await fetchAll(core, 'modules');
  await upsertBatch(
    academy,
    'modules',
    coreModules,
    ['id', 'course_id', 'title', 'content', 'order_index'],
    ['id'],
    ['course_id', 'title', 'content', 'order_index'],
  );

  const coreLessons = await fetchAll(core, 'lessons');
  await upsertBatch(
    academy,
    'lessons',
    coreLessons,
    ['id', 'module_id', 'title', 'content', 'video_url', 'duration', 'order_index'],
    ['id'],
    ['module_id', 'title', 'content', 'video_url', 'duration', 'order_index'],
  );

  const coreEnrollments = await fetchAll(core, 'enrollments');
  await upsertBatch(
    academy,
    'enrollments',
    coreEnrollments,
    ['id', 'user_id', 'course_id', 'progress_percentage', 'last_accessed', 'completed_at'],
    ['id'],
    ['user_id', 'course_id', 'progress_percentage', 'last_accessed', 'completed_at'],
  );

  console.log(
    `[ACADEMY] core->academy: courses=${coreCourses.length}, modules=${coreModules.length}, lessons=${coreLessons.length}, enrollments=${coreEnrollments.length}`,
  );
}

async function migrateRealtime(core, realtime) {
  console.log('\n[REALTIME] Migrating chat_rooms, messages, room_participants...');

  const rooms = await fetchAll(core, 'chat_rooms');
  await upsertBatch(
    realtime,
    'chat_rooms',
    rooms,
    ['id', 'name', 'topic', 'is_private', 'is_premium', 'created_at'],
    ['id'],
    ['name', 'topic', 'is_private', 'is_premium', 'created_at'],
  );

  const msgs = await fetchAll(core, 'messages');
  await upsertBatch(
    realtime,
    'messages',
    msgs,
    ['id', 'room_id', 'user_id', 'sender_name', 'content', 'is_ai', 'created_at'],
    ['id'],
    ['room_id', 'user_id', 'sender_name', 'content', 'is_ai', 'created_at'],
  );

  const participants = await fetchAll(core, 'room_participants');
  // CORE room_participants has no id; REALTIME shard uses (room_id,user_id) unique.
  await upsertBatch(
    realtime,
    'room_participants',
    participants,
    ['room_id', 'user_id', 'joined_at'],
    ['room_id', 'user_id'],
    ['joined_at'],
  );

  console.log(`[REALTIME] core->realtime: chat_rooms=${rooms.length}, messages=${msgs.length}, room_participants=${participants.length}`);
}

async function migrateMarketing(core, marketing) {
  console.log('\n[MARKETING] Migrating marketing_tasks, published_posts, seo_monitor...');

  const tasks = await fetchAll(core, 'marketing_tasks');
  await upsertBatch(
    marketing,
    'marketing_tasks',
    tasks,
    ['id', 'campaign_type', 'target_url', 'context', 'platform', 'status', 'scheduled_for', 'created_at'],
    ['id'],
    ['campaign_type', 'target_url', 'context', 'platform', 'status', 'scheduled_for', 'created_at'],
  );

  const posts = await fetchAll(core, 'published_posts');
  await upsertBatch(
    marketing,
    'published_posts',
    posts,
    ['id', 'task_id', 'post_url', 'external_post_id', 'generated_copy', 'metrics', 'posted_at'],
    ['id'],
    ['task_id', 'post_url', 'external_post_id', 'generated_copy', 'metrics', 'posted_at'],
  );

  const seo = await fetchAll(core, 'seo_monitor');
  await upsertBatch(
    marketing,
    'seo_monitor',
    seo,
    ['id', 'keyword', 'current_rank', 'target_page', 'notes', 'checked_at'],
    ['id'],
    ['keyword', 'current_rank', 'target_page', 'notes', 'checked_at'],
  );

  console.log(`[MARKETING] core->marketing: tasks=${tasks.length}, posts=${posts.length}, seo_monitor=${seo.length}`);
}

async function migrateBotfarm(core, botfarm) {
  console.log('\n[BOTFARM] Migrating knowledge_base, generation_queue...');

  const kb = await fetchAll(core, 'knowledge_base');
  const kbRows = kb.map((r) => ({
    id: r.id,
    chunk_text: r.chunk_text,
    source_file: r.source_file,
    created_at: r.created_at,
  }));
  await upsertBatch(
    botfarm,
    'knowledge_base',
    kbRows,
    ['id', 'chunk_text', 'source_file', 'created_at'],
    ['id'],
    ['chunk_text', 'source_file', 'created_at'],
  );

  const q = await fetchAll(core, 'generation_queue');
  const qRows = q.map((r) => ({
    id: r.id,
    type: r.target_type ?? 'recipe',
    topic: r.topic,
    tier: 'PREMIUM',
    status: r.status ?? 'pending',
    result_payload: r.result_payload,
    error_message: r.error_message,
    created_at: r.created_at,
    completed_at: r.completed_at,
  }));

  await upsertBatch(
    botfarm,
    'generation_queue',
    qRows,
    ['id', 'type', 'topic', 'tier', 'status', 'result_payload', 'error_message', 'created_at', 'completed_at'],
    ['id'],
    ['type', 'topic', 'tier', 'status', 'result_payload', 'error_message', 'created_at', 'completed_at'],
  );

  console.log(`[BOTFARM] core->botfarm: knowledge_base=${kb.length}, generation_queue=${q.length}`);
}

async function main() {
  const core = pgClient(requireEnv('DATABASE_URL_CORE'));
  const lab = pgClient(requireEnv('DATABASE_URL_LAB'));
  const recipes = pgClient(requireEnv('DATABASE_URL_RECIPES'));
  const academy = pgClient(requireEnv('DATABASE_URL_ACADEMY'));
  const realtime = pgClient(requireEnv('DATABASE_URL_REALTIME'));
  const marketing = pgClient(requireEnv('DATABASE_URL_MARKETING'));
  const botfarm = pgClient(requireEnv('DATABASE_URL_BOTFARM'));

  await Promise.all([core.connect(), lab.connect(), recipes.connect(), academy.connect(), realtime.connect(), marketing.connect(), botfarm.connect()]);

  try {
    console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
    await migrateLab(core, lab);
    await migrateRecipes(core, recipes);
    await migrateAcademy(core, academy);
    await migrateRealtime(core, realtime);
    await migrateMarketing(core, marketing);
    await migrateBotfarm(core, botfarm);
    console.log('\n✅ Migration complete');
  } finally {
    await Promise.allSettled([core.end(), lab.end(), recipes.end(), academy.end(), realtime.end(), marketing.end(), botfarm.end()]);
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});

