const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUri = process.env.DATABASE_URL;
if (!dbUri) {
  console.error('Missing DATABASE_URL. Define it in your environment or in .env.local.');
  process.exit(1);
}

async function setup() {
  const client = new Client({ connectionString: dbUri, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  console.log('--- SETTING UP AURA GASTRONOMY SCHEMA ---');
  
  const sql = `
    -- Academia
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      level TEXT CHECK (level IN ('Básico', 'Intermedio', 'Chef', 'Chef Elite')),
      duration TEXT,
      lessons_count INTEGER DEFAULT 0,
      is_premium BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      video_url TEXT,
      duration TEXT,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
      questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Laboratory
    CREATE TABLE IF NOT EXISTS ingredients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      category TEXT,
      origin TEXT,
      optimal_temp TEXT,
      ph_range TEXT,
      moisture TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS techniques (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      difficulty TEXT,
      science_basis TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Recetario
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      difficulty TEXT,
      prep_time TEXT,
      tier TEXT DEFAULT 'FREE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Messaging
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      type TEXT DEFAULT 'public',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id UUID,
      sender_name TEXT,
      content TEXT NOT NULL,
      is_ai BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Profiles
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY, -- Links to auth.users
      full_name TEXT,
      email TEXT,
      role TEXT DEFAULT 'USER',
      tier TEXT DEFAULT 'FREE',
      avatar_url TEXT,
      chef_level TEXT,
      bio TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES profiles(id),
      name TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS Policies (Basic Public Read for content)
    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'courses') THEN
        CREATE POLICY "Public Access" ON courses FOR SELECT USING (true);
      END IF;
    END $$;

    ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'ingredients') THEN
        CREATE POLICY "Public Access" ON ingredients FOR SELECT USING (true);
      END IF;
    END $$;

    ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'techniques') THEN
        CREATE POLICY "Public Access" ON techniques FOR SELECT USING (true);
      END IF;
    END $$;

    ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'recipes') THEN
        CREATE POLICY "Public Access" ON recipes FOR SELECT USING (true);
      END IF;
    END $$;
  `;
  
  try {
    await client.query(sql);
    console.log('Successfully applied AURA GASTRONOMY schema.');
  } catch (e) {
    console.error('Error applying schema:', e.message);
  } finally {
    await client.end();
  }
}

setup();
