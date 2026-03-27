import { NextResponse } from 'next/server';

import { labServiceDb } from '@/lib/supabase';
import { requireUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) return NextResponse.json([]);

    const { data, error } = await labServiceDb()
      .from('ingredients')
      .select('id, name, category, technical_data')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[lab-search] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
