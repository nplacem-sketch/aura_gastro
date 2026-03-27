const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL_CORE, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const res = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'");
    console.log('COLUMNS:', res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e.message);
  } finally {
    await c.end();
  }
}
run();
