import { NextRequest, NextResponse } from 'next/server';

import { identityServiceDb } from '@/lib/supabase';
import { getRequestAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const requestedUserId = req.nextUrl.searchParams.get('userId');
    const targetUserId =
      requestedUserId && auth.profile?.role === 'ADMIN' ? requestedUserId : auth.user.id;

    const { data: profile, error } = await identityServiceDb()
      .from('profiles')
      .select('role, plan')
      .eq('id', targetUserId)
      .single();

    if (error) {
      console.error('[API/Profile] Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
