import { NextResponse } from 'next/server';

import { buildCatalogState } from '@/lib/academy-progression';
import { getVerifiedCatalog } from '@/lib/verified-catalog';
import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const verifiedTitles = getVerifiedCatalog().courses.map((course) => course.title);
  const [coursesRes, enrollmentsRes] = await Promise.all([
    academySvc().from('courses').select('id,title,description,level,tier,created_at,course_order').order('course_order'),
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

  const validCourses = (coursesRes.data ?? []).filter((course) => verifiedTitles.includes(course.title));
  const catalog = buildCatalogState(validCourses, enrollmentsRes.data ?? [], auth.profile?.plan ?? 'FREE', auth.profile?.role ?? 'USER');
  return NextResponse.json({ courses: catalog });
}
