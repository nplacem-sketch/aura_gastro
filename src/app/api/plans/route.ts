import { NextResponse } from 'next/server';

import { identityServiceDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await identityServiceDb()
    .from('plans')
    .select('name, price_monthly_eur, price_annual_eur, features')
    .order('price_monthly_eur', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}
