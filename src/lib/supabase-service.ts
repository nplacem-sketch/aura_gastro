import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Shard = 'identity' | 'academy' | 'lab' | 'marketing' | 'realtime' | 'botfarm' | 'recipes';

const serviceClientCache = new Map<Shard, SupabaseClient>();

function requireEnv(name: string, value: string | undefined): string {
  if (value) return value;
  throw new Error(`Missing required env var: ${name}`);
}

function shardKey(shard: Shard): string {
  switch (shard) {
    case 'identity':
      return 'IDENTITY';
    case 'academy':
      return 'ACADEMY';
    case 'lab':
      return 'LAB';
    case 'marketing':
      return 'MARKETING';
    case 'realtime':
      return 'REALTIME';
    case 'botfarm':
      return 'BOTFARM';
    case 'recipes':
      return 'RECIPES';
  }
}

function getShardUrl(shard: Shard): string | undefined {
  const key = shardKey(shard);
  return (
    process.env[`SUPABASE_${key}_URL`] ||
    process.env[`NEXT_PUBLIC_SUPABASE_${key}_URL`] ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ) as string | undefined;
}

function getServiceKey(shard: Shard): string | undefined {
  const key = shardKey(shard);
  return (
    process.env[`SUPABASE_${key}_SERVICE_KEY`] ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) as string | undefined;
}

function getServiceClient(shard: Shard): SupabaseClient {
  const cached = serviceClientCache.get(shard);
  if (cached) return cached;

  const url = requireEnv(
    `SUPABASE_${shardKey(shard)}_URL (or NEXT_PUBLIC_SUPABASE_${shardKey(shard)}_URL / NEXT_PUBLIC_SUPABASE_URL)`,
    getShardUrl(shard),
  );
  const serviceKey = requireEnv(
    `SUPABASE_${shardKey(shard)}_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)`,
    getServiceKey(shard),
  );

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  serviceClientCache.set(shard, client);
  return client;
}

export function identitySvc() {
  return getServiceClient('identity');
}
export function academySvc() {
  return getServiceClient('academy');
}
export function labSvc() {
  return getServiceClient('lab');
}
export function marketingSvc() {
  return getServiceClient('marketing');
}
export function chatSvc() {
  return getServiceClient('realtime');
}
export function botFarmSvc() {
  return getServiceClient('botfarm');
}
export function recipesSvc() {
  return getServiceClient('recipes');
}

