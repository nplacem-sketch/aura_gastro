-- Academy shard: courses, modules, lessons, exams, enrollments
create extension if not exists pgcrypto;

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  course_order integer default 0,
  level text,
  duration text,
  lessons_count integer default 0,
  tier text not null default 'FREE',
  is_premium boolean not null default false,
  is_ai_generated boolean not null default false,
  status text not null default 'published',
  author text default 'AURA GASTRONOMY Academy',
  tags text[],
  created_at timestamptz not null default now()
);

-- Ensure expected columns exist on existing installs
alter table courses add column if not exists image_url text;
alter table courses add column if not exists course_order integer default 0;
alter table courses add column if not exists level text;
alter table courses add column if not exists duration text;
alter table courses add column if not exists lessons_count integer default 0;
alter table courses add column if not exists tier text not null default 'FREE';
alter table courses add column if not exists is_premium boolean not null default false;
alter table courses add column if not exists is_ai_generated boolean not null default false;
alter table courses add column if not exists status text not null default 'published';
alter table courses add column if not exists author text default 'AURA GASTRONOMY Academy';
alter table courses add column if not exists tags text[];
alter table courses add column if not exists created_at timestamptz not null default now();

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  content text,
  order_index integer not null default 0
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  duration text,
  order_index integer not null default 0
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade unique,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid references courses(id) on delete cascade,
  progress_percentage integer not null default 0,
  last_accessed timestamptz default now(),
  completed_at timestamptz,
  exam_attempts integer not null default 0,
  best_score integer not null default 0,
  last_score integer not null default 0,
  exam_passed boolean not null default false,
  payment_required boolean not null default false,
  payment_unlocked boolean not null default false,
  locked_until timestamptz,
  unique (user_id, course_id)
);

alter table enrollments add column if not exists exam_attempts integer not null default 0;
alter table enrollments add column if not exists best_score integer not null default 0;
alter table enrollments add column if not exists last_score integer not null default 0;
alter table enrollments add column if not exists exam_passed boolean not null default false;
alter table enrollments add column if not exists payment_required boolean not null default false;
alter table enrollments add column if not exists payment_unlocked boolean not null default false;
alter table enrollments add column if not exists locked_until timestamptz;

-- Grants for server-side automation (service role)
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
