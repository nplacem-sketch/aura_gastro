/**
 * Anonymize instructor/author fields and scrub well-known real chef names from text content.
 *
 * This helps reduce legal/privacy risk by avoiding real-person names in public content.
 *
 * Requires in .env.local:
 * - DATABASE_URL_ACADEMY
 * - DATABASE_URL_RECIPES
 * - DATABASE_URL_LAB
 *
 * Run:
 *   node scripts/anonymize_instructors_and_scrub_names.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = require('pg');
const { parse } = require('pg-connection-string');

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

function pickPseudoName(uuid) {
  const names = [
    'Alex',
    'María',
    'Javier',
    'Lucía',
    'Sergio',
    'Carmen',
    'Diego',
    'Elena',
    'Pablo',
    'Nuria',
    'Hugo',
    'Sara',
    'Adrián',
    'Laura',
    'Irene',
    'Daniel',
    'Claudia',
    'Raúl',
    'Noa',
    'Álvaro',
  ];

  const hex = String(uuid || '').replace(/-/g, '');
  let acc = 0;
  for (let i = 0; i < hex.length; i++) acc = (acc + hex.charCodeAt(i)) % 2147483647;
  return names[acc % names.length];
}

const CHEF_NAME_PATTERNS = [
  // Commonly referenced real chefs (expand if needed)
  'gordon\\s+ramsay',
  'ferran\\s+adri[aàá]',
  'massimo\\s+bottura',
  'joan\\s+roca',
  'rene\\s+redzepi',
  'heston\\s+blumenthal',
  'alain\\s+ducasse',
  'thomas\\s+keller',
  'daniel\\s+bolud',
  'jos[ée]\\s+andr[ée]s',
];

async function scrubPatterns(client, table, columns, patterns) {
  for (const col of columns) {
    for (const p of patterns) {
      const sql = `
        update ${table}
        set "${col}" = regexp_replace("${col}", $1, 'Chef Anónimo', 'gi')
        where "${col}" is not null and "${col}" ~* $1
      `;
      await client.query(sql, [p]);
    }
  }
}

async function anonymizeAcademy(academy) {
  console.log('[ACADEMY] Anonymizing instructors/authors and scrubbing names...');

  const courses = await academy.query(`select id from courses`);
  for (const row of courses.rows) {
    const pseudo = pickPseudoName(row.id);
    await academy.query(
      `
      update courses
      set instructor = $1,
          author = $2
      where id = $3
      `,
      [`Instructor ${pseudo}`, 'Equipo AURA GASTRONOMY', row.id],
    );
  }

  await scrubPatterns(academy, 'courses', ['title', 'description', 'full_content', 'author', 'instructor'], CHEF_NAME_PATTERNS);
  await scrubPatterns(academy, 'modules', ['title', 'content'], CHEF_NAME_PATTERNS);
  await scrubPatterns(academy, 'lessons', ['title', 'content'], CHEF_NAME_PATTERNS);

  console.log('[ACADEMY] Done');
}

async function anonymizeRecipes(recipes) {
  console.log('[RECIPES] Scrubbing names...');
  await scrubPatterns(recipes, 'recipes', ['title', 'description'], CHEF_NAME_PATTERNS);
  await scrubPatterns(recipes, 'recipe_steps', ['instruction'], CHEF_NAME_PATTERNS);
  console.log('[RECIPES] Done');
}

async function anonymizeLab(lab) {
  console.log('[LAB] Scrubbing names...');
  await scrubPatterns(lab, 'techniques', ['name', 'description'], CHEF_NAME_PATTERNS);
  await scrubPatterns(lab, 'ingredients', ['name', 'culinary_notes'], CHEF_NAME_PATTERNS);
  console.log('[LAB] Done');
}

async function main() {
  const academy = pgClient(requireEnv('DATABASE_URL_ACADEMY'));
  const recipes = pgClient(requireEnv('DATABASE_URL_RECIPES'));
  const lab = pgClient(requireEnv('DATABASE_URL_LAB'));

  await Promise.all([academy.connect(), recipes.connect(), lab.connect()]);
  try {
    await anonymizeAcademy(academy);
    await anonymizeRecipes(recipes);
    await anonymizeLab(lab);
    console.log('✅ Anonymization complete');
  } finally {
    await Promise.allSettled([academy.end(), recipes.end(), lab.end()]);
  }
}

main().catch((err) => {
  console.error('❌ Anonymization failed:', err.message);
  process.exit(1);
});
