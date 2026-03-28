import { NextResponse } from 'next/server';

import { buildCatalogState } from '@/lib/academy-progression';
import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [coursesRes, enrollmentsRes] = await Promise.all([
    academySvc()
      .from('courses')
      .select('id,title,description,level,tier,created_at,course_order,status')
      .eq('status', 'published')
      .order('course_order'),
    academySvc()
      .from('enrollments')
      .select('course_id,progress_percentage,completed_at,exam_attempts,best_score,last_score,exam_passed,payment_required,payment_unlocked,locked_until')
      .eq('user_id', auth.user.id),
  ]);

  if (coursesRes.error) {
    return NextResponse.json({ error: coursesRes.error.message }, { status: 500 });
  }

  if (enrollmentsRes.error) {
    return NextResponse.json({ error: enrollmentsRes.error.message }, { status: 500 });
  }

  const catalog = buildCatalogState(
    coursesRes.data ?? [],
    enrollmentsRes.data ?? [],
    auth.profile?.plan ?? 'FREE',
    auth.profile?.role ?? 'USER',
    { includePlanLocked: true },
  );
  return NextResponse.json({ courses: catalog }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}
