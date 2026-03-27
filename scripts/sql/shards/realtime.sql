-- Realtime shard: chat_rooms, messages, room_participants
create extension if not exists pgcrypto;

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  topic text,
  is_private boolean not null default false,
  is_premium boolean not null default false,
  owner_user_id uuid,
  peer_user_id uuid,
  business_id uuid,
  created_at timestamptz not null default now()
);

alter table chat_rooms add column if not exists owner_user_id uuid;
alter table chat_rooms add column if not exists peer_user_id uuid;
alter table chat_rooms add column if not exists business_id uuid;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid,
  sender_name text not null default 'Anonimo',
  content text not null,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);
