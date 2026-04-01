import 'server-only';

import { findVerifiedEntry, getVerifiedCatalog } from '@/lib/verified-catalog';

type LessonLike = {
  title: string;
  content?: string | null;
  duration?: string | null;
  order_index?: number;
  id?: string;
};

type ModuleLike = {
  title: string;
  content?: string | null;
  order_index?: number;
  id?: string;
  lessons?: LessonLike[];
};

function normalizeComparable(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isWeakLessonContent(content: string | null | undefined) {
  const normalized = normalizeComparable(content);
  return !normalized || normalized.includes('contenido tecnico en revision');
}

function hasStoredCourseContent(modules: ModuleLike[]) {
  return modules.some((module) => {
    if (!isWeakLessonContent(module.content)) {
      return true;
    }

    return (module.lessons || []).some((lesson) => !isWeakLessonContent(lesson.content));
  });
}

function normalizeModule(module: ModuleLike, moduleIndex: number, courseDescription: string) {
  return {
    ...module,
    content: String(module.content || '').trim(),
    order_index: module.order_index ?? moduleIndex,
    lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
      ...lesson,
      content: String(lesson.content || module.content || courseDescription || '').trim(),
      duration: lesson.duration || 'Lectura guiada',
      order_index: lesson.order_index ?? lessonIndex,
    })),
  };
}

export function buildFallbackCoursePayload(course: Record<string, any>, modules: ModuleLike[]) {
  const verified = findVerifiedEntry('course', String(course.title || '')) || getVerifiedCatalog().courses[0];
  const hasStoredModules = modules.length > 0 && hasStoredCourseContent(modules);
  const sourceModules = hasStoredModules
    ? modules
    : verified.modules.map((module: any, moduleIndex: number) => ({
        id: `fallback-module-${moduleIndex}`,
        title: module.title,
        content: module.content,
        order_index: moduleIndex,
        lessons: module.lessons.map((lesson: any, lessonIndex: number) => ({
          id: `fallback-lesson-${moduleIndex}-${lessonIndex}`,
          title: lesson.title,
          content: lesson.content || module.content || course.description || '',
          duration: lesson.duration,
          order_index: lessonIndex,
        })),
      }));

  const normalizedModules = sourceModules.map((module: ModuleLike, moduleIndex: number) =>
    normalizeModule(module, moduleIndex, String(course.description || verified.description || '')),
  );

  return {
    course: {
      ...course,
      title: course.title || verified.title,
      description: course.description || verified.description,
      level: course.level || verified.level,
      tier: course.tier || verified.tier,
    },
    modules: normalizedModules,
  };
}
