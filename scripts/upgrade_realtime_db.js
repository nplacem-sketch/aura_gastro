const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function upgradeRealtimeDb() {
  const connectionString = process.env.DATABASE_URL_REALTIME;
  if (!connectionString) {
    console.error('No se configuró DATABASE_URL_REALTIME en .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Conectado a la BD Realtime...');

    console.log('Añadiendo columnas de media a posts...');
    await client.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';
    `);

    console.log('✅ Base de datos Realtime actualizada para Media.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

upgradeRealtimeDb();
