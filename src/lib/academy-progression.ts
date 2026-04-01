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
};

const TIER_WEIGHTS: Record<string, number> = {
  FREE: 1,
  PRO: 2,
  PREMIUM: 3,
  ENTERPRISE: 4
};

export function sortCourses(courses: CourseRecord[]) {
  return [...courses].sort((a, b) => {
    const tierA = TIER_WEIGHTS[a.tier] ?? 99;
    const tierB = TIER_WEIGHTS[b.tier] ?? 99;
    
    if (tierA !== tierB) {
      return tierA - tierB;
    }

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
  options?: {
    includePlanLocked?: boolean;
  },
) {
  const enrollmentMap = new Map(enrollments.map((item) => [item.course_id, item]));
  const sorted = sortCourses(courses).filter((course) => {
    if (options?.includePlanLocked) return true;
    return canAccessTier(plan, course.tier, role) || role === 'ADMIN';
  });

  return sorted.map((course) => {
    const enrollment = enrollmentMap.get(course.id) || null;
    const passed = Boolean(enrollment?.completed_at);

    return {
      ...course,
      enrollment,
      passed,
      unlockedByOrder: true,
      lockedUntil: null,
      premiumLocked: false,
    };
  });
}
