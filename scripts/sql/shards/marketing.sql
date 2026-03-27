-- Marketing shard: marketing_tasks, published_posts, seo_monitor
create extension if not exists pgcrypto;

create table if not exists marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_type text not null, -- NEW_RECIPE | NEW_COURSE | TRENDING_TOPIC
  target_url text,
  context text,
  platform text,
  status text not null default 'pending_generation',
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists published_posts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references marketing_tasks(id),
  post_url text,
  external_post_id text,
  generated_copy text,
  metrics jsonb default '{"likes":0,"shares":0}'::jsonb,
  posted_at timestamptz not null default now()
);

create table if not exists seo_monitor (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  current_rank integer,
  target_page text,
  notes text,
  checked_at timestamptz not null default now()
);

