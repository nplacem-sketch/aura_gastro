-- Botfarm shard: knowledge_base, generation_queue
create extension if not exists pgcrypto;

create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  chunk_text text not null,
  source_file text,
  tags text[],
  created_at timestamptz not null default now()
);

create table if not exists generation_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- recipe | course | marketing
  topic text not null,
  tier text not null default 'PREMIUM',
  status text not null default 'pending',
  result_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Grants for server-side automation (service role)
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
