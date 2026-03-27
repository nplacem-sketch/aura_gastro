import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';
import { identitySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await identitySvc()
    .from('content_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const type = String(body.type || '').trim().toUpperCase();
  const title = String(body.title || '').trim();
  const details = String(body.details || '').trim();
  const quantity = Number(body.quantity || 1);
  const targetPlans = Array.isArray(body.targetPlans)
    ? body.targetPlans.map((item: unknown) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];

  if (!type || !title) {
    return NextResponse.json({ error: 'Missing type or title' }, { status: 400 });
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
  }

  if (targetPlans.length === 0) {
    return NextResponse.json({ error: 'Select at least one target plan' }, { status: 400 });
  }

  const normalizedDetails = [
    `Cantidad solicitada: ${quantity}`,
    `Planes objetivo: ${targetPlans.join(', ')}`,
    details ? `Detalle editorial: ${details}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await identitySvc()
    .from('content_requests')
    .insert({
      requested_by: auth.user.id,
      type,
      title,
      details: normalizedDetails,
      status: 'PENDING',
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
