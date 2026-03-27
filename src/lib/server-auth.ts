import 'server-only';

import type { User } from '@supabase/supabase-js';

import { identitySvc } from '@/lib/supabase-service';

type AuthProfile = {
  id: string;
  role: string;
  plan: string;
};

type AuthSuccess = {
  ok: true;
  token: string;
  user: User;
  profile: AuthProfile | null;
};

type AuthFailure = {
  ok: false;
  error: string;
  status: number;
};

type AuthResult = AuthSuccess | AuthFailure;

function readBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

function isInternalRequest(req: Request): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return false;
  const provided = req.headers.get('x-internal-api-key');
  return provided === expected;
}

export async function getRequestAuth(req: Request): Promise<AuthResult> {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }

  const {
    data: { user },
    error: authError,
  } = await identitySvc().auth.getUser(token);

  if (authError || !user) {
    return { ok: false, error: 'Invalid token', status: 401 };
  }

  const { data: profile, error: profileError } = await identitySvc()
    .from('profiles')
    .select('id, role, plan')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message, status: 500 };
  }

  return { ok: true, token, user, profile: (profile as AuthProfile | null) ?? null };
}

export async function requireUser(req: Request): Promise<AuthResult> {
  return getRequestAuth(req);
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await getRequestAuth(req);
  if (!auth.ok) return auth;

  if (auth.profile?.role !== 'ADMIN') {
    return { ok: false, error: 'Forbidden', status: 403 };
  }

  return auth;
}

export async function requireAdminOrInternal(req: Request): Promise<AuthResult | { ok: true; internal: true }> {
  if (isInternalRequest(req)) {
    return { ok: true, internal: true };
  }

  return requireAdmin(req);
}
