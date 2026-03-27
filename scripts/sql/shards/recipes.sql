-- Recipes shard: recipes, recipe_steps, recipe_ingredients
create extension if not exists pgcrypto;

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  category text,
  difficulty text,
  prep_time text,
  cover_image text,
  is_premium boolean not null default false,
  is_ai_generated boolean not null default false,
  tier text not null default 'FREE',
  tags text[],
  created_at timestamptz not null default now()
);

alter table recipes add column if not exists category text;
alter table recipes add column if not exists prep_time text;
alter table recipes add column if not exists cover_image text;
alter table recipes add column if not exists is_premium boolean not null default false;
alter table recipes add column if not exists is_ai_generated boolean not null default false;
alter table recipes add column if not exists tier text not null default 'FREE';
alter table recipes add column if not exists tags text[];
alter table recipes add column if not exists created_at timestamptz not null default now();

create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  step_number integer not null,
  instruction text not null,
  media_url text
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  ingredient_id uuid,
  name text not null,
  quantity text,
  unit text
);

create table if not exists escandallos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  pax integer,
  ingredients jsonb not null default '[]'::jsonb,
  total_cost numeric(10,2),
  cost_per_serving numeric(10,2),
  created_at timestamptz not null default now()
);

create table if not exists technical_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  category text,
  plan_tier text not null default 'PREMIUM',
  yield_text text,
  ingredients jsonb not null default '[]'::jsonb,
  method text not null default '',
  plating_notes text,
  allergens text[] default '{}',
  cost_summary jsonb not null default '{}'::jsonb,
  source_recipe_id uuid,
  source_escandallo_id uuid,
  created_at timestamptz not null default now()
);

alter table technical_sheets add column if not exists category text;
alter table technical_sheets add column if not exists plan_tier text not null default 'PREMIUM';
alter table technical_sheets add column if not exists yield_text text;
alter table technical_sheets add column if not exists ingredients jsonb not null default '[]'::jsonb;
alter table technical_sheets add column if not exists method text not null default '';
alter table technical_sheets add column if not exists plating_notes text;
alter table technical_sheets add column if not exists cost_summary jsonb not null default '{}'::jsonb;
alter table technical_sheets add column if not exists source_recipe_id uuid;
alter table technical_sheets add column if not exists source_escandallo_id uuid;

-- Grants for server-side automation (service role)
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
