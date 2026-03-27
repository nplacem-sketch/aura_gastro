// Apply a shard schema to a specific Supabase Postgres database.
// Usage:
//   node scripts/setup_shard_schema.js <shard>
// Example:
//   node scripts/setup_shard_schema.js academy
//
// Requires:
//   DATABASE_URL_<SHARD> in the environment (or .env.local)
//   e.g. DATABASE_URL_ACADEMY=postgresql://...
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const shard = (process.argv[2] || '').toLowerCase();
const allowed = ['identity', 'academy', 'lab', 'recipes', 'realtime', 'botfarm', 'marketing'];

if (!allowed.includes(shard)) {
  console.error(`Invalid shard "${shard}". Use one of: ${allowed.join(', ')}`);
  process.exit(1);
}

const envKey = `DATABASE_URL_${shard.toUpperCase()}`;
const databaseUrl = process.env[envKey];
if (!databaseUrl) {
  console.error(`Missing ${envKey}. Define it in your environment or in .env.local.`);
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, `./sql/shards/${shard}.sql`);
if (!fs.existsSync(sqlPath)) {
  console.error(`Missing schema file: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`✅ Schema applied for shard "${shard}" (${envKey})`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`❌ Failed applying schema for shard "${shard}":`, err.message);
  process.exit(1);
});

