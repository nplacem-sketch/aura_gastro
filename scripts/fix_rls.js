const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function updateRLS(dbUrl, table) {
  if (!dbUrl) return;
  const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query(`DROP POLICY IF EXISTS "Public ${table} read" ON ${table}`);
    await c.query(`DROP POLICY IF EXISTS "Public read ${table}" ON ${table}`);
    await c.query(`DROP POLICY IF EXISTS "Public read all" ON ${table}`);
    
    // Create new permissive policy for catalog viewing
    await c.query(`CREATE POLICY "Public ${table} read" ON ${table} FOR SELECT USING (true);`);
    console.log(`✅ RLS updated for ${table}`);
  } catch (e) {
    console.log(`⚠️ Error on ${table}: ${e.message}`);
  } finally {
    await c.end();
  }
}

async function run() {
  await updateRLS(process.env.DATABASE_URL_ACADEMY, 'courses');
  await updateRLS(process.env.DATABASE_URL_RECIPES, 'recipes');
  await updateRLS(process.env.DATABASE_URL_LAB, 'ingredients');
  await updateRLS(process.env.DATABASE_URL_LAB, 'techniques');
  console.log('Done RLS update.');
}

run();
