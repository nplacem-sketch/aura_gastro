const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupRealtimeDb() {
  const connectionString = process.env.DATABASE_URL_REALTIME;
  if (!connectionString) {
    console.error('No se configuró DATABASE_URL_REALTIME en .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Conectado a la BD Realtime...');

    // Extensión pgcrypto para UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    console.log('Creando tabla posts (hilos)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id UUID NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT DEFAULT 'USER',
        content TEXT NOT NULL,
        parent_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        likes_count INT DEFAULT 0,
        replies_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Creando tabla post_likes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (post_id, user_id)
      );
    `);

    console.log('Configurando Supabase Realtime publication...');
    // Drop existing publication if modifying
    await client.query(`
      BEGIN;
      -- Eliminamos tabla de la publication si existe
      ALTER PUBLICATION supabase_realtime DROP TABLE posts;
      COMMIT;
    `).catch(() => {});

    await client.query(`
      BEGIN;
      ALTER PUBLICATION supabase_realtime ADD TABLE posts;
      COMMIT;
    `).catch((err) => {
      console.log('Publication note (often acceptable if already exists):', err.message);
    });

    console.log('✅ Base de datos Realtime inicializada para la Red Social.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

setupRealtimeDb();
