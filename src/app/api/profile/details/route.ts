import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/server-auth';
import { identitySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const PROFILE_SELECT =
  'id,full_name,email,avatar_url,role,plan,status,subscription_status,subscription_ends_at,created_at';

function buildResponseProfile(profile: any, user: any) {
  return {
    ...profile,
    cv_url: typeof user.user_metadata?.cv_url === 'string' ? user.user_metadata.cv_url : null,
    cv_name: typeof user.user_metadata?.cv_name === 'string' ? user.user_metadata.cv_name : null,
  };
}

async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const client = identitySvc();
  const { data: existing, error: findError } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (findError) {
    return { data: null, error: findError };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name: String(user.user_metadata?.full_name || user.email || 'Chef Aura'),
    avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    role: String(user.app_metadata?.role || 'USER').toUpperCase(),
    plan: String(user.app_metadata?.plan || 'FREE').toUpperCase(),
    status: 'ACTIVE',
    subscription_status: String(user.app_metadata?.subscription_status || 'inactive'),
  };

  const { data: created, error: createError } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_SELECT)
    .single();

  return { data: created, error: createError };
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await ensureProfile(auth.user);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(buildResponseProfile(data, auth.user));
}

export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const profileUpdate: Record<string, string | null> = {};
  const metadataUpdate: Record<string, string | null> = {};

  if (typeof body.full_name === 'string') {
    profileUpdate.full_name = body.full_name.trim();
    metadataUpdate.full_name = body.full_name.trim();
  }
  if (typeof body.avatar_url === 'string' || body.avatar_url === null) {
    profileUpdate.avatar_url = body.avatar_url;
    metadataUpdate.avatar_url = body.avatar_url;
  }
  if (typeof body.cv_url === 'string' || body.cv_url === null) {
    metadataUpdate.cv_url = body.cv_url;
  }
  if (typeof body.cv_name === 'string' || body.cv_name === null) {
    metadataUpdate.cv_name = body.cv_name;
  }

  if (Object.keys(profileUpdate).length === 0 && Object.keys(metadataUpdate).length === 0) {
    return NextResponse.json({ error: 'No profile fields supplied' }, { status: 400 });
  }

  const existing = await ensureProfile(auth.user);
  if (existing.error || !existing.data) {
    return NextResponse.json({ error: existing.error?.message || 'Profile not found' }, { status: 500 });
  }

  let nextProfile = existing.data;
  if (Object.keys(profileUpdate).length > 0) {
    const { data, error } = await identitySvc()
      .from('profiles')
      .update(profileUpdate)
      .eq('id', auth.user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    nextProfile = data;
  }

  await identitySvc().auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...(auth.user.user_metadata || {}),
      ...metadataUpdate,
    },
  });

  return NextResponse.json(
    buildResponseProfile(nextProfile, {
      ...auth.user,
      user_metadata: {
        ...(auth.user.user_metadata || {}),
        ...metadataUpdate,
      },
    }),
  );
}
