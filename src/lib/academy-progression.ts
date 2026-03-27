import 'server-only';

import { canAccessTier } from '@/lib/access';

type CourseRecord = {
  id: string;
  title: string;
  tier: string;
  course_order?: number | null;
  created_at?: string | null;
};

type EnrollmentRecord = {
  course_id: string;
  progress_percentage?: number | null;
  completed_at?: string | null;
  exam_attempts?: number | null;
  best_score?: number | null;
  last_score?: number | null;
  exam_passed?: boolean | null;
  payment_required?: boolean | null;
  payment_unlocked?: boolean | null;
  locked_until?: string | null;
};

export function sortCourses(courses: CourseRecord[]) {
  return [...courses].sort((a, b) => {
    const left = a.course_order ?? Number.MAX_SAFE_INTEGER;
    const right = b.course_order ?? Number.MAX_SAFE_INTEGER;
    if (left !== right) return left - right;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });
}

export function buildCatalogState(
  courses: CourseRecord[],
  enrollments: EnrollmentRecord[],
  plan: string,
  role: string,
) {
  const enrollmentMap = new Map(enrollments.map((item) => [item.course_id, item]));
  const sorted = sortCourses(courses).filter((course) => canAccessTier(plan, course.tier, role) || role === 'ADMIN');
  const lockSource = role === 'ADMIN'
    ? null
    : enrollments.find((item) => {
        if (!item.locked_until || item.payment_unlocked) return false;
        return new Date(item.locked_until).getTime() > Date.now();
      }) ?? null;
  const lockedCourse = lockSource ? courses.find((course) => course.id === lockSource.course_id) ?? null : null;
  const activePremiumLock = lockSource?.locked_until ?? null;

  let gateOpen = true;

  return sorted.map((course) => {
    const enrollment = enrollmentMap.get(course.id) || null;
    const passed = Boolean(enrollment?.exam_passed || enrollment?.completed_at);
    const bypassed = Boolean(enrollment?.payment_unlocked);
    const premiumLocked = Boolean(
      activePremiumLock &&
      lockedCourse &&
      course.tier === 'PREMIUM' &&
      (course.course_order ?? 0) > (lockedCourse.course_order ?? 0) &&
      !passed &&
      !bypassed,
    );
    const unlockedByOrder = role === 'ADMIN' ? true : gateOpen && !premiumLocked;

    if (role !== 'ADMIN' && !passed && !bypassed && gateOpen) {
      gateOpen = false;
    }

    return {
      ...course,
      enrollment,
      passed,
      bypassed,
      unlockedByOrder,
      attemptsUsed: enrollment?.exam_attempts ?? 0,
      paymentRequired: Boolean(enrollment?.payment_required && !enrollment?.payment_unlocked),
      lockedUntil: enrollment?.locked_until ?? activePremiumLock,
      premiumLocked,
    };
  });
}

export function calculateExamScore(questions: Array<{ correct_index?: number }>, answers: number[]) {
  const total = questions.length;
  const correct = questions.reduce((sum, question, index) => sum + (answers[index] === question.correct_index ? 1 : 0), 0);
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percentage };
}
