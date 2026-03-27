// =============================================================================
// AURA GASTRONOMY – Full 7-Module Schema Setup
// Run: node scripts/setup_schema_full.js
// =============================================================================
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const DB_URI = process.env.DATABASE_URL;
if (!DB_URI) {
  console.error('Missing DATABASE_URL. Define it in your environment or in .env.local.');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DB_URI, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to primary DB\n');

  const sql = /* sql */ `
  -- ── CLEAN START: Drop all existing tables ─────────────────────────────────
  DROP TABLE IF EXISTS published_posts CASCADE;
  DROP TABLE IF EXISTS marketing_tasks CASCADE;
  DROP TABLE IF EXISTS seo_monitor CASCADE;
  DROP TABLE IF EXISTS knowledge_base CASCADE;
  DROP TABLE IF EXISTS generation_queue CASCADE;
  DROP TABLE IF EXISTS recipe_steps CASCADE;
  DROP TABLE IF EXISTS recipe_ingredients CASCADE;
  DROP TABLE IF EXISTS recipes CASCADE;
  DROP TABLE IF EXISTS ingredient_properties CASCADE;
  DROP TABLE IF EXISTS techniques CASCADE;
  DROP TABLE IF EXISTS ingredients CASCADE;
  DROP TABLE IF EXISTS lessons CASCADE;
  DROP TABLE IF EXISTS modules CASCADE;
  DROP TABLE IF EXISTS exams CASCADE;
  DROP TABLE IF EXISTS enrollments CASCADE;
  DROP TABLE IF EXISTS courses CASCADE;
  DROP TABLE IF EXISTS messages CASCADE;
  DROP TABLE IF EXISTS room_participants CASCADE;
  DROP TABLE IF EXISTS chat_rooms CASCADE;
  DROP TABLE IF EXISTS businesses CASCADE;
  DROP TABLE IF EXISTS plans CASCADE;
  DROP TABLE IF EXISTS profiles CASCADE;

  -- ============================================================
  -- MODULE 1: profiles (Identity & Billing)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY, -- mirrors auth.users.id
    full_name       TEXT,
    email           TEXT,
    avatar_url      TEXT,
    role            TEXT NOT NULL DEFAULT 'USER',    -- USER | CHEF | ADMIN
    plan            TEXT NOT NULL DEFAULT 'FREE',    -- FREE | PRO | PREMIUM | ENTERPRISE
    stripe_customer TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS plans (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     TEXT NOT NULL UNIQUE,            -- FREE | PRO | PREMIUM | ENTERPRISE
    price_monthly_eur NUMERIC(8,2) DEFAULT 0,
    price_annual_eur  NUMERIC(8,2) DEFAULT 0,
    stripe_price_monthly TEXT,
    stripe_price_annual  TEXT,
    features JSONB DEFAULT '{}'::jsonb
  );

  -- Upsert plan catalog (prices per PRD)
  INSERT INTO plans (name, price_monthly_eur, price_annual_eur, features) VALUES
    ('FREE',       0,      0,      '{"courses_limit":1,"ai_access":false,"lab_access":false}'::jsonb),
    ('PRO',        39,     398,    '{"courses_limit":5,"ai_access":false,"lab_access":true}'::jsonb),
    ('PREMIUM',    69,     662,    '{"courses_limit":null,"ai_access":true,"lab_access":true}'::jsonb),
    ('ENTERPRISE', 149,    1341,   '{"courses_limit":null,"ai_access":true,"lab_access":true,"bot_access":true}'::jsonb)
  ON CONFLICT (name) DO UPDATE
    SET price_monthly_eur = EXCLUDED.price_monthly_eur,
        price_annual_eur  = EXCLUDED.price_annual_eur,
        features          = EXCLUDED.features;

  -- ============================================================
  -- MODULE 2: Recipes Master
  -- ============================================================
  CREATE TABLE IF NOT EXISTS recipes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID,                    -- author (bot or human)
    title          TEXT NOT NULL,
    description    TEXT,
    difficulty     TEXT CHECK (difficulty IN ('Básico','Medio','Avanzado','Experto')),
    cover_image    TEXT,
    is_premium     BOOLEAN NOT NULL DEFAULT false,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    tier           TEXT NOT NULL DEFAULT 'FREE',
    tags           TEXT[],
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS recipe_steps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id    UUID REFERENCES recipes(id) ON DELETE CASCADE,
    step_number  INTEGER NOT NULL,
    instruction  TEXT NOT NULL,
    media_url    TEXT
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id     UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID,
    name          TEXT NOT NULL,
    quantity      TEXT,
    unit          TEXT
  );

  -- ============================================================
  -- MODULE 3: Laboratory (ingredients + techniques)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    scientific_name TEXT,
    category        TEXT,
    origin_region   TEXT,
    best_season     TEXT[],
    technical_data  JSONB DEFAULT '{}'::jsonb,
    culinary_notes  TEXT,
    image_url       TEXT,
    is_premium      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS techniques (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    description       TEXT,
    difficulty        TEXT,
    science_basis     TEXT,
    equipment_needed  TEXT,
    temperature_control TEXT,
    is_premium        BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS ingredient_properties (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    property_key  TEXT NOT NULL,
    property_value TEXT,
    unit          TEXT
  );

  -- ============================================================
  -- MODULE 4: Academy (courses, modules, lessons, enrollments)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS courses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    description   TEXT,
    image_url     TEXT,
    level         TEXT CHECK (level IN ('Básico','Intermedio','Chef','Chef Elite')),
    duration      TEXT,
    lessons_count INTEGER DEFAULT 0,
    is_premium    BOOLEAN NOT NULL DEFAULT false,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    status        TEXT NOT NULL DEFAULT 'published',
    author        TEXT DEFAULT 'AURA GASTRONOMY Academy',
    tags          TEXT[],
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS modules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID REFERENCES modules(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT,
    video_url   TEXT,
    duration    TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exams (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    course_id           UUID REFERENCES courses(id) ON DELETE CASCADE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    last_accessed       TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    UNIQUE (user_id, course_id)
  );

  -- ============================================================
  -- MODULE 5: Realtime Chat
  -- ============================================================
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    topic      TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id     UUID,
    sender_name TEXT NOT NULL DEFAULT 'Anónimo',
    content     TEXT NOT NULL,
    is_ai       BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS room_participants (
    room_id    UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
  );

  -- ============================================================
  -- MODULE 6: Bot Farm 1 – RAG / Knowledge Base
  -- ============================================================
  CREATE TABLE IF NOT EXISTS knowledge_base (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    chunk_text  TEXT NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS generation_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic           TEXT NOT NULL,
    target_type     TEXT NOT NULL DEFAULT 'recipe',   -- recipe | course | ingredient
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | completed | failed
    result_payload  JSONB,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
  );

  -- ============================================================
  -- MODULE 7: Bot Farm 2 – Marketing / Viralization
  -- ============================================================
  CREATE TABLE IF NOT EXISTS marketing_tasks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_type  TEXT NOT NULL,   -- NEW_RECIPE | NEW_COURSE | TRENDING_TOPIC
    target_url     TEXT,
    context        TEXT,            -- JSON or plaintext depending on platform
    platform       TEXT,            -- X | INSTAGRAM | TIKTOK
    status         TEXT NOT NULL DEFAULT 'pending_generation',  -- pending_generation | ready_to_post | posted
    scheduled_for  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS published_posts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID REFERENCES marketing_tasks(id),
    post_url         TEXT,
    external_post_id TEXT,
    generated_copy   TEXT,
    metrics          JSONB DEFAULT '{"likes":0,"shares":0}'::jsonb,
    posted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS seo_monitor (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword       TEXT NOT NULL,
    current_rank  INTEGER,
    target_page   TEXT,
    notes         TEXT,
    checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ============================================================
  -- Businesses
  -- ============================================================
  CREATE TABLE IF NOT EXISTS businesses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            UUID,
    name                TEXT NOT NULL,
    logo_url            TEXT,
    website             TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ============================================================
  -- RLS Policies
  -- ============================================================
  ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE recipes        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ingredients    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE techniques     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE courses        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_rooms     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE enrollments    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE marketing_tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE knowledge_base  ENABLE ROW LEVEL SECURITY;

  -- Public content — free-tier read access
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='courses' AND policyname='Public courses read') THEN
      CREATE POLICY "Public courses read" ON courses FOR SELECT USING (is_premium = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='Public recipes read') THEN
      CREATE POLICY "Public recipes read" ON recipes FOR SELECT USING (is_premium = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ingredients' AND policyname='Public ingredients read') THEN
      CREATE POLICY "Public ingredients read" ON ingredients FOR SELECT USING (is_premium = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='techniques' AND policyname='Public techniques read') THEN
      CREATE POLICY "Public techniques read" ON techniques FOR SELECT USING (is_premium = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_rooms' AND policyname='Public rooms read') THEN
      CREATE POLICY "Public rooms read" ON chat_rooms FOR SELECT USING (is_private = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Public messages read') THEN
      CREATE POLICY "Public messages read" ON messages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Own profile read') THEN
      CREATE POLICY "Own profile read" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Own profile update') THEN
      CREATE POLICY "Own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
  END $$;
  `;

  try {
    await client.query(sql);
    console.log('✅ Full AURA GASTRONOMY schema applied successfully!');
  } catch (err) {
    console.error('❌ Schema error:', err.message);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
