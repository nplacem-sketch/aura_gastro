import { NextResponse } from 'next/server';

import { recipesServiceDb } from '@/lib/supabase';
import { requireUser } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name, pax, ingredients, total_cost, cost_per_serving } = body;

    if (!name || !ingredients) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      user_id: auth.user.id,
      name,
      pax,
      ingredients,
      total_cost,
      cost_per_serving,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await recipesServiceDb().from('escandallos').insert([payload]).select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[recipe-save] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
