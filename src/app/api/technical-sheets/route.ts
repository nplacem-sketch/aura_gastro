import { NextResponse } from 'next/server';

import { canAccessTier } from '@/lib/access';
import { requireUser } from '@/lib/server-auth';
import { enrichTechnicalSheet } from '@/lib/technical-sheets';
import { recipesSvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canAccessTier(auth.profile?.plan ?? 'FREE', 'PREMIUM', auth.profile?.role ?? 'USER')) {
    return NextResponse.json({ error: 'Módulo reservado para planes premium.' }, { status: 403 });
  }

  const [sheetsRes, escandallosRes] = await Promise.all([
    recipesSvc()
      .from('technical_sheets')
      .select('*')
      .or(`user_id.eq.${auth.user.id},user_id.is.null`)
      .order('created_at', { ascending: false }),
    recipesSvc()
      .from('escandallos')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (sheetsRes.error) {
    return NextResponse.json({ error: sheetsRes.error.message }, { status: 500 });
  }

  if (escandallosRes.error) {
    return NextResponse.json({ error: escandallosRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    sheets: (sheetsRes.data ?? []).map((sheet) => enrichTechnicalSheet(sheet as any)),
    escandallos: escandallosRes.data ?? [],
  });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canAccessTier(auth.profile?.plan ?? 'FREE', 'PREMIUM', auth.profile?.role ?? 'USER')) {
    return NextResponse.json({ error: 'Módulo reservado para planes premium.' }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || '').trim();
  const method = String(body.method || '').trim();
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];

  if (!title || !method || ingredients.length === 0) {
    return NextResponse.json({ error: 'Faltan campos obligatorios en la ficha técnica.' }, { status: 400 });
  }

  const payload = {
    user_id: auth.user.id,
    title,
    category: body.category || 'Producción',
    plan_tier: body.plan_tier || 'PREMIUM',
    yield_text: body.yield_text || null,
    ingredients,
    method,
    plating_notes: body.plating_notes || null,
    allergens: Array.isArray(body.allergens) ? body.allergens : [],
    cost_summary: body.cost_summary && typeof body.cost_summary === 'object' ? body.cost_summary : {},
    source_recipe_id: body.source_recipe_id || null,
    source_escandallo_id: body.source_escandallo_id || null,
  };

  const { data, error } = await recipesSvc().from('technical_sheets').insert(payload).select('*').single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sheet: enrichTechnicalSheet(data as any) });
}
