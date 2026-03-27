import { NextResponse } from 'next/server';

import { buildCatalogState, calculateExamScore } from '@/lib/academy-progression';
import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const courseId = params.id;
  const body = await req.json();
  const answers = Array.isArray(body.answers) ? body.answers.map((value: unknown) => Number(value)) : [];

  const [examRes, coursesRes, enrollmentsRes, currentEnrollmentRes] = await Promise.all([
    academySvc().from('exams').select('questions').eq('course_id', courseId).single(),
    academySvc().from('courses').select('id,title,tier,course_order,created_at'),
    academySvc()
      .from('enrollments')
      .select('course_id,progress_percentage,completed_at,exam_attempts,best_score,last_score,exam_passed,payment_required,payment_unlocked,locked_until')
      .eq('user_id', auth.user.id),
    academySvc()
      .from('enrollments')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('course_id', courseId)
      .maybeSingle(),
  ]);

  if (examRes.error) return NextResponse.json({ error: examRes.error.message }, { status: 500 });
  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 });
  if (enrollmentsRes.error) return NextResponse.json({ error: enrollmentsRes.error.message }, { status: 500 });
  if (currentEnrollmentRes.error) return NextResponse.json({ error: currentEnrollmentRes.error.message }, { status: 500 });

  const catalog = buildCatalogState(coursesRes.data ?? [], enrollmentsRes.data ?? [], auth.profile?.plan ?? 'FREE', auth.profile?.role ?? 'USER');
  const state = catalog.find((item) => item.id === courseId);
  if (!state) return NextResponse.json({ error: 'Curso no disponible' }, { status: 404 });
  if (!state.unlockedByOrder && auth.profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Debes completar el curso anterior primero' }, { status: 403 });
  }

  const questions = Array.isArray(examRes.data?.questions) ? examRes.data.questions : [];
  if (questions.length === 0) {
    return NextResponse.json({ error: 'Examen no disponible' }, { status: 400 });
  }

  const score = calculateExamScore(questions, answers);
  const previous = currentEnrollmentRes.data;
  const attempts = Number(previous?.exam_attempts ?? 0) + 1;
  const passed = score.percentage >= 60;
  const paymentRequired = !passed && attempts >= 3;
  const lockedUntil = paymentRequired
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : passed
      ? null
      : previous?.locked_until ?? null;

  const payload = {
    user_id: auth.user.id,
    course_id: courseId,
    progress_percentage: passed ? 100 : Number(previous?.progress_percentage ?? 0),
    last_accessed: new Date().toISOString(),
    completed_at: passed ? new Date().toISOString() : previous?.completed_at ?? null,
    exam_attempts: attempts,
    best_score: Math.max(Number(previous?.best_score ?? 0), score.percentage),
    last_score: score.percentage,
    exam_passed: passed,
    payment_required: paymentRequired,
    payment_unlocked: passed ? false : previous?.payment_unlocked ?? false,
    locked_until: passed ? null : lockedUntil,
  };

  const { error: upsertError } = await academySvc().from('enrollments').upsert(payload, { onConflict: 'user_id,course_id' });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({
    passed,
    percentage: score.percentage,
    correct: score.correct,
    total: score.total,
    attempts,
    attemptsRemaining: Math.max(0, 3 - attempts),
    paymentRequired,
    lockedUntil,
    review: paymentRequired
      ? questions.map((question: any, index: number) => ({
          question: question.question,
          selectedIndex: answers[index] ?? -1,
          correctIndex: Number(question.correct_index ?? -1),
          options: Array.isArray(question.options) ? question.options : [],
        }))
      : [],
  });
}
