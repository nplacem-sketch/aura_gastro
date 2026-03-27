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

function wordCount(text: string | null | undefined) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isWeakLessonContent(content: string | null | undefined) {
  const normalized = String(content || '').trim().toLowerCase();
  return !normalized || normalized.includes('contenido técnico en revisión') || wordCount(content) < 120;
}

export function buildCourseLessonContent(courseTitle: string, moduleTitle: string, lessonTitle: string, seed: string) {
  const sections = [
    ['Objetivo operativo', `La lección "${lessonTitle}" dentro de "${courseTitle}" se trabaja como una unidad técnica aplicable a producción real. El objetivo es traducir ${seed} a decisiones repetibles de mise en place, control de variables y ejecución en servicio.`],
    ['Fundamento culinario', `Antes de ejecutar, el alumno debe entender que ${seed} no es una consigna abstracta, sino una relación entre producto, formulación, temperatura, tiempo y textura. Este enfoque evita reproducir pasos de memoria sin criterio técnico.`],
    ['Secuencia de trabajo', `Dentro del módulo "${moduleTitle}" conviene ordenar la práctica en pesado, mezcla, reposo, control visual, corrección y acabado. Cada una de esas fases exige registrar referencias útiles para poder repetir el resultado en brigada.`],
    ['Puntos críticos', `Los errores habituales aparecen cuando se altera la dosificación, se omiten reposos o se interpreta mal la reacción del sistema. La buena práctica consiste en tocar una sola variable cada vez y comprobar su efecto antes de avanzar.`],
    ['Aplicación en servicio', `Una vez dominada la teoría, ${lessonTitle} debe resolverse con criterio de restaurante: tiempos compactos, orden de salida, estabilidad del producto y capacidad de regeneración si el pase se retrasa.`],
    ['Control sensorial', `La validación final exige observar textura, temperatura, brillo, aroma y persistencia. El parámetro técnico solo es correcto si sirve al plato y mejora la experiencia del comensal.`],
  ];

  let content = sections.map(([title, body]) => `## ${title}\n\n${body}`).join('\n\n');
  while (wordCount(content) < 900) {
    content += `\n\n## Desarrollo complementario\n\nEn una cocina profesional, ${lessonTitle} también exige documentación, limpieza de proceso, uso correcto del utillaje y lectura de incidencias. El alumno debe ser capaz de anticipar problemas, justificar cada ajuste y dejar un protocolo claro para el resto del equipo.`;
  }

  return content;
}

export function buildFallbackCoursePayload(course: Record<string, any>, modules: ModuleLike[], exam: any[]) {
  const verified = findVerifiedEntry('course', String(course.title || '')) || getVerifiedCatalog().courses[0];
  const safeModules = modules.length > 0 ? modules : [];

  const normalizedModules = (safeModules.length > 0 ? safeModules : verified.modules.map((module: any, moduleIndex: number) => ({
    id: `fallback-module-${moduleIndex}`,
    title: module.title,
    content: module.content,
    order_index: moduleIndex,
    lessons: module.lessons.map((lesson: any, lessonIndex: number) => ({
      id: `fallback-lesson-${moduleIndex}-${lessonIndex}`,
      title: lesson.title,
      content: buildCourseLessonContent(course.title, module.title, lesson.title, lesson.content || module.content || course.description || ''),
      duration: lesson.duration,
      order_index: lessonIndex,
    })),
  }))).map((module: any) => ({
    ...module,
    lessons: (module.lessons || []).map((lesson: any, lessonIndex: number) => ({
      ...lesson,
      content: isWeakLessonContent(lesson.content)
        ? buildCourseLessonContent(course.title, module.title, lesson.title, lesson.content || module.content || course.description || '')
        : lesson.content,
      duration: lesson.duration || 'Lectura guiada',
      order_index: lesson.order_index ?? lessonIndex,
    })),
  }));

  const normalizedExam = Array.isArray(exam) && exam.length > 0 ? exam : verified.exam;

  return {
    course: {
      ...course,
      title: course.title || verified.title,
      description: course.description || verified.description,
      level: course.level || verified.level,
      tier: course.tier || verified.tier,
    },
    modules: normalizedModules,
    exam: normalizedExam,
  };
}
