const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const connectionString = process.env.DATABASE_URL_CORE || process.env.DATABASE_URL_IDENTITY;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL_CORE or DATABASE_URL_IDENTITY');
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_url TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_name TEXT;
    `);
    console.log('Profile asset columns ensured.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
