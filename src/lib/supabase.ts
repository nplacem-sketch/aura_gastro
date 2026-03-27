import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Shard = 'identity' | 'academy' | 'lab' | 'marketing' | 'realtime' | 'botfarm' | 'recipes';

const publicClientCache = new Map<Shard, SupabaseClient>();
let shardAccessToken: string | null = null;

function shardKey(shard: Shard): string {
  switch (shard) {
    case 'identity':  return 'IDENTITY';
    case 'academy':   return 'ACADEMY';
    case 'lab':       return 'LAB';
    case 'marketing': return 'MARKETING';
    case 'realtime':  return 'REALTIME';
    case 'botfarm':   return 'BOTFARM';
    case 'recipes':   return 'RECIPES';
  }
}

function getPublicShardUrl(shard: Shard): string | undefined {
  switch (shard) {
    case 'identity':  return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case 'academy':   return process.env.NEXT_PUBLIC_SUPABASE_ACADEMY_URL;
    case 'lab':       return process.env.NEXT_PUBLIC_SUPABASE_LAB_URL;
    case 'marketing': return process.env.NEXT_PUBLIC_SUPABASE_MARKETING_URL;
    case 'realtime':  return process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL;
    case 'botfarm':   return process.env.NEXT_PUBLIC_SUPABASE_BOTFARM_URL;
    case 'recipes':   return process.env.NEXT_PUBLIC_SUPABASE_RECIPES_URL;
  }
}

function getPublicShardAnonKey(shard: Shard): string | undefined {
  switch (shard) {
    case 'identity':  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    case 'academy':   return process.env.NEXT_PUBLIC_SUPABASE_ACADEMY_ANON_KEY;
    case 'lab':       return process.env.NEXT_PUBLIC_SUPABASE_LAB_ANON_KEY;
    case 'marketing': return process.env.NEXT_PUBLIC_SUPABASE_MARKETING_ANON_KEY;
    case 'realtime':  return process.env.NEXT_PUBLIC_SUPABASE_REALTIME_ANON_KEY;
    case 'botfarm':   return process.env.NEXT_PUBLIC_SUPABASE_BOTFARM_ANON_KEY;
    case 'recipes':   return process.env.NEXT_PUBLIC_SUPABASE_RECIPES_ANON_KEY;
  }
}

function getServiceShardKey(shard: Shard): string | undefined {
  switch (shard) {
    case 'identity':  return process.env.SUPABASE_SERVICE_ROLE_KEY;
    case 'academy':   return process.env.SUPABASE_ACADEMY_SERVICE_KEY;
    case 'lab':       return process.env.SUPABASE_LAB_SERVICE_KEY;
    case 'marketing': return process.env.SUPABASE_MARKETING_SERVICE_KEY;
    case 'realtime':  return process.env.SUPABASE_REALTIME_SERVICE_KEY;
    case 'botfarm':   return process.env.SUPABASE_BOTFARM_SERVICE_KEY;
    case 'recipes':   return process.env.SUPABASE_RECIPES_SERVICE_KEY;
  }
}

function requireEnv(name: string, value: string | undefined): string {
  if (value) return value;
  throw new Error(`Missing required env var: ${name}`);
}

function buildPublicClient(shard: Shard): SupabaseClient {
  const url = requireEnv(`URL for ${shard}`, getPublicShardUrl(shard));
  const anonKey = requireEnv(`ANON_KEY for ${shard}`, getPublicShardAnonKey(shard));

  const isIdentity = shard === 'identity';
  const options: any = {
    auth: isIdentity
      ? { persistSession: true, autoRefreshToken: true }
      : { persistSession: false, autoRefreshToken: false },
  };

  return createClient(url, anonKey, options);
}

function getPublicClient(shard: Shard): SupabaseClient {
  const cached = publicClientCache.get(shard);
  if (cached) return cached;
  const client = buildPublicClient(shard);
  publicClientCache.set(shard, client);
  return client;
}

export function propagateSession(accessToken: string | null) {
  if (shardAccessToken === accessToken) return;
  shardAccessToken = accessToken;
  publicClientCache.delete('identity');
}

// --- Public Accessors ---
export const supabase = () => getPublicClient('identity');
export const academyDb = () => getPublicClient('academy');
export const labDb = () => getPublicClient('lab');
export const marketingDb = () => getPublicClient('marketing');
export const chatDb = () => getPublicClient('realtime');
export const botFarmDb = () => getPublicClient('botfarm');
export const recipesDb = () => getPublicClient('recipes');

// --- Server-Only Service Accessors ---
export function getServiceShard(shard: Shard) {
  const url = getPublicShardUrl(shard);
  const key = getServiceShardKey(shard);
  if (!url || !key) throw new Error(`Missing service config for ${shard}`);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const identityServiceDb = () => getServiceShard('identity');
export const academyServiceDb = () => getServiceShard('academy');
export const labServiceDb = () => getServiceShard('lab');
export const recipesServiceDb = () => getServiceShard('recipes');
export const marketingServiceDb = () => getServiceShard('marketing');

export default supabase;
