const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixShard(dbUrl, tables, shardName) {
  if (!dbUrl) {
    console.log(`⚠️ No URL for ${shardName}`);
    return;
  }
  console.log(`📡 Connecting to ${shardName}...`);
  const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    console.log(`🔗 Connected to ${shardName}`);
    for (const table of tables) {
      console.log(`🛠  Fixing ${table}...`);
      await c.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
      await c.query(`DROP POLICY IF EXISTS "Public ${table} read" ON public."${table}"`);
      await c.query(`CREATE POLICY "Public ${table} read" ON public."${table}" FOR SELECT USING (true);`);
      await c.query(`GRANT SELECT ON public."${table}" TO anon, authenticated;`);
      await c.query(`GRANT ALL ON public."${table}" TO postgres, service_role;`);
    }
    console.log(`✅ ${shardName} Fixed successfully.`);
  } catch (e) {
    console.log(`❌ ERR on ${shardName}: ${e.message}`);
  } finally {
    try { await c.end(); } catch {}
  }
}

async function run() {
  await fixShard(process.env.DATABASE_URL_ACADEMY, ['courses', 'modules', 'lessons', 'exams', 'enrollments'], 'ACADEMY');
  await fixShard(process.env.DATABASE_URL_RECIPES, ['recipes', 'recipe_ingredients'], 'RECIPES');
  await fixShard(process.env.DATABASE_URL_LAB, ['ingredients', 'techniques'], 'LAB');
  console.log('🏁 All shards processed.');
}

run();
