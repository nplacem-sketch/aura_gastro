import { NextResponse } from 'next/server';

import { buildFallbackCoursePayload } from '@/lib/academy-content';
import { buildCatalogState } from '@/lib/academy-progression';
import { canAccessTier } from '@/lib/access';
import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const courseId = params.id;

  const [courseRes, modulesRes, enrollmentsRes, coursesRes] = await Promise.all([
    academySvc().from('courses').select('*').eq('id', courseId).single(),
    academySvc().from('modules').select('*').eq('course_id', courseId).order('order_index'),
    academySvc()
      .from('enrollments')
      .select('course_id,progress_percentage,completed_at')
      .eq('user_id', auth.user.id),
    academySvc().from('courses').select('id,title,tier,course_order,created_at'),
  ]);

  if (courseRes.error) return NextResponse.json({ error: courseRes.error.message }, { status: 500 });
  if (auth.profile?.role !== 'ADMIN' && !canAccessTier(auth.profile?.plan ?? 'FREE', courseRes.data.tier, auth.profile?.role ?? 'USER')) {
    return NextResponse.json({ error: 'Curso no disponible para tu plan' }, { status: 403 });
  }
  if (modulesRes.error) return NextResponse.json({ error: modulesRes.error.message }, { status: 500 });
  if (enrollmentsRes.error) return NextResponse.json({ error: enrollmentsRes.error.message }, { status: 500 });
  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 });

  const moduleIds = (modulesRes.data ?? []).map((item) => item.id);
  const lessonsRes = moduleIds.length > 0
    ? await academySvc().from('lessons').select('*').in('module_id', moduleIds).order('order_index')
    : { data: [], error: null };

  if (lessonsRes.error) return NextResponse.json({ error: lessonsRes.error.message }, { status: 500 });

  const modules = (modulesRes.data ?? []).map((module) => ({
    ...module,
    lessons: (lessonsRes.data ?? []).filter((lesson) => lesson.module_id === module.id),
  }));
  const coursePayload = buildFallbackCoursePayload(courseRes.data, modules);

  const catalog = buildCatalogState(coursesRes.data ?? [], enrollmentsRes.data ?? [], auth.profile?.plan ?? 'FREE', auth.profile?.role ?? 'USER');
  const state = catalog.find((item) => item.id === courseId) || null;
  if (state?.premiumLocked && auth.profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'La academia premium esta bloqueada temporalmente', lockedUntil: state.lockedUntil }, { status: 423 });
  }

  return NextResponse.json({
    course: coursePayload.course,
    modules: coursePayload.modules,
    state,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
