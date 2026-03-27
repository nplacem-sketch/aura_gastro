-- Identity shard (Core): profiles, plans, businesses
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key, -- mirrors auth.users.id (in the Identity project)
  full_name text,
  email text,
  avatar_url text,
  cv_url text,
  cv_name text,
  role text not null default 'USER', -- USER | CHEF | ADMIN
  plan text not null default 'FREE', -- FREE | PRO | PREMIUM | ENTERPRISE
  status text not null default 'ACTIVE',
  stripe_customer text,
  subscription_status text default 'inactive',
  subscription_ends_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists status text not null default 'ACTIVE';
alter table profiles add column if not exists subscription_ends_at timestamptz;
alter table profiles add column if not exists cv_url text;
alter table profiles add column if not exists cv_name text;

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- FREE | PRO | PREMIUM | ENTERPRISE
  price_monthly_eur numeric(8,2) default 0,
  price_annual_eur numeric(8,2) default 0,
  stripe_price_monthly text,
  stripe_price_annual text,
  features jsonb default '{}'::jsonb
);

insert into plans (name, price_monthly_eur, price_annual_eur, features) values
  ('FREE',       0,      0,      '{"courses_limit":1,"ai_access":false,"lab_access":false}'::jsonb),
  ('PRO',        39,     398,    '{"courses_limit":5,"ai_access":false,"lab_access":true}'::jsonb),
  ('PREMIUM',    69,     662,    '{"courses_limit":null,"ai_access":true,"lab_access":true}'::jsonb),
  ('ENTERPRISE', 149,    1341,   '{"courses_limit":null,"ai_access":true,"lab_access":true,"bot_access":true}'::jsonb)
on conflict (name) do update
  set price_monthly_eur = excluded.price_monthly_eur,
      price_annual_eur  = excluded.price_annual_eur,
      features          = excluded.features;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  logo_url text,
  description text,
  contact_email text,
  website text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table businesses add column if not exists description text;
alter table businesses add column if not exists contact_email text;

create table if not exists content_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid,
  type text not null,
  title text not null,
  details text,
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);
