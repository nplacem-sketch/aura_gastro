-- Lab shard: ingredients, techniques, ingredient_properties
create extension if not exists pgcrypto;

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  scientific_name text,
  category text,
  tier text not null default 'FREE',
  origin_region text,
  best_season text[],
  technical_data jsonb default '{}'::jsonb,
  culinary_notes text,
  image_url text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- If the shard already exists with an older schema, ensure required columns/constraints
-- used by the app/API are present (idempotent upgrades).
create unique index if not exists ingredients_name_key on ingredients(name);
alter table ingredients add column if not exists scientific_name text;
alter table ingredients add column if not exists tier text not null default 'FREE';
alter table ingredients add column if not exists origin_region text;
alter table ingredients add column if not exists best_season text[];
alter table ingredients add column if not exists technical_data jsonb default '{}'::jsonb;
alter table ingredients add column if not exists culinary_notes text;
alter table ingredients add column if not exists image_url text;
alter table ingredients add column if not exists is_premium boolean not null default false;

create table if not exists techniques (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  difficulty text,
  tier text not null default 'PREMIUM',
  science_basis text,
  equipment_needed text,
  temperature_control text,
  is_premium boolean not null default true,
  created_at timestamptz not null default now()
);

alter table techniques add column if not exists science_basis text;
alter table techniques add column if not exists tier text not null default 'PREMIUM';
alter table techniques add column if not exists equipment_needed text;
alter table techniques add column if not exists temperature_control text;
alter table techniques add column if not exists is_premium boolean not null default true;

create table if not exists ingredient_properties (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references ingredients(id) on delete cascade,
  property_name text not null,
  property_value text,
  unit text,
  created_at timestamptz not null default now()
);

-- Grants for server-side automation (service role)
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
