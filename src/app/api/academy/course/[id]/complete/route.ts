import { NextResponse } from 'next/server';

import { buildCatalogState } from '@/lib/academy-progression';
import { canAccessTier } from '@/lib/access';
import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const courseId = params.id;

  const [courseRes, enrollmentsRes, coursesRes] = await Promise.all([
    academySvc().from('courses').select('id,title,tier').eq('id', courseId).single(),
    academySvc()
      .from('enrollments')
      .select('course_id,progress_percentage,completed_at')
      .eq('user_id', auth.user.id),
    academySvc().from('courses').select('id,title,tier,course_order,created_at'),
  ]);

  if (courseRes.error) return NextResponse.json({ error: courseRes.error.message }, { status: 500 });
  if (enrollmentsRes.error) return NextResponse.json({ error: enrollmentsRes.error.message }, { status: 500 });
  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 });

  if (auth.profile?.role !== 'ADMIN' && !canAccessTier(auth.profile?.plan ?? 'FREE', courseRes.data.tier, auth.profile?.role ?? 'USER')) {
    return NextResponse.json({ error: 'Curso no disponible para tu plan' }, { status: 403 });
  }

  const catalog = buildCatalogState(coursesRes.data ?? [], enrollmentsRes.data ?? [], auth.profile?.plan ?? 'FREE', auth.profile?.role ?? 'USER');
  const state = catalog.find((item) => item.id === courseId) || null;

  if (!state) {
    return NextResponse.json({ error: 'Curso no encontrado en el catalogo' }, { status: 404 });
  }

  if (auth.profile?.role !== 'ADMIN' && state.premiumLocked) {
    return NextResponse.json({ error: 'La academia premium esta bloqueada temporalmente', lockedUntil: state.lockedUntil }, { status: 423 });
  }

  const current = (enrollmentsRes.data ?? []).find((item) => item.course_id === courseId) || null;
  const completedAt = current?.completed_at ?? new Date().toISOString();
  const payload = {
    user_id: auth.user.id,
    course_id: courseId,
    progress_percentage: 100,
    completed_at: completedAt,
  };

  const { error: upsertError } = await academySvc().from('enrollments').upsert(payload, { onConflict: 'user_id,course_id' });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({
    passed: true,
    completedAt,
  });
}
