const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check(url, tableName) {
  if (!url) { console.log(`⏩ Skipping ${tableName} (no URL)`); return; }
  console.log(`🔍 Checking ${tableName}...`);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const res = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`);
  console.log(`📊 ${tableName.toUpperCase()} SCHEMA (${res.rows.length} columns):`, res.rows.map(r => r.column_name).join(', '));
  await c.end();
}

async function run() {
  try {
    await check(process.env.DATABASE_URL_CORE, 'profiles');
    await check(process.env.DATABASE_URL_ACADEMY, 'courses');
    await check(process.env.DATABASE_URL_RECIPES, 'recipes');
    await check(process.env.DATABASE_URL_LAB, 'ingredients');
  } catch (e) {
    console.error(e.message);
  }
}
run();
