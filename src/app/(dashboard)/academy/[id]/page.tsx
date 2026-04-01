'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import AppIcon from '@/components/AppIcon';
import LessonContent from '@/components/academy/LessonContent';
import { useAuth } from '@/lib/auth-context';

type Lesson = {
  id: string;
  title: string;
  content: string;
  video_url?: string;
  duration?: string;
  order_index: number;
};

type Module = {
  id: string;
  title: string;
  content?: string;
  order_index: number;
  lessons: Lesson[];
};

type CourseState = {
  unlockedByOrder: boolean;
  passed: boolean;
  lockedUntil?: string | null;
  premiumLocked?: boolean;
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, role } = useAuth();

  const [course, setCourse] = useState<Record<string, any> | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [state, setState] = useState<CourseState | null>(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      setCourseError(null);

      const res = await fetch(`/api/academy/course/${id}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        cache: 'no-store',
      });

      const data = await res.json();
      if (!res.ok) {
        setCourse(null);
        setModules([]);
        setState(data.state ?? null);
        setCourseError(data.error ?? 'No se pudo cargar el curso.');
        setLoading(false);
        return;
      }

      setCourse(data.course ?? null);
      setModules(data.modules ?? []);
      setState(data.state ?? null);
      setActiveModuleIdx(0);
      setActiveLessonIdx(0);
      setLoading(false);
    }

    if (session?.access_token && id) {
      void fetchCourse();
    }
  }, [id, session?.access_token]);

  useEffect(() => {
    if (!modules.length) {
      return;
    }

    const safeModuleIdx = Math.min(activeModuleIdx, modules.length - 1);
    const safeLessonIdx = Math.min(activeLessonIdx, Math.max(0, (modules[safeModuleIdx]?.lessons.length ?? 1) - 1));

    if (safeModuleIdx !== activeModuleIdx) {
      setActiveModuleIdx(safeModuleIdx);
    }
    if (safeLessonIdx !== activeLessonIdx) {
      setActiveLessonIdx(safeLessonIdx);
    }
  }, [activeLessonIdx, activeModuleIdx, modules]);

  const currentModule = modules[activeModuleIdx];
  const currentLesson = currentModule?.lessons[activeLessonIdx];
  const isLastLesson =
    modules.length > 0 &&
    activeModuleIdx === modules.length - 1 &&
    activeLessonIdx === ((currentModule?.lessons.length ?? 1) - 1);

  async function markCourseComplete() {
    if (!session?.access_token) return;
    setCompleting(true);
    setCourseError(null);

    const res = await fetch(`/api/academy/course/${id}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await res.json();

    if (!res.ok) {
      setCourseError(data.error ?? 'No se pudo completar el curso.');
      setCompleting(false);
      return;
    }

    setState((prev) => ({
      unlockedByOrder: prev?.unlockedByOrder ?? true,
      passed: true,
      lockedUntil: prev?.lockedUntil ?? null,
      premiumLocked: prev?.premiumLocked ?? false,
    }));
    setCompleting(false);
  }

  if (loading) {
    return <div className="animate-pulse p-20 text-center font-label uppercase tracking-widest text-secondary">Sincronizando archivos maestros...</div>;
  }

  if (!course) {
    return <div className="p-20 text-center text-on-surface-variant">{courseError || 'Curso no encontrado.'}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-16 sm:pb-20">
      <header className="mb-10 border-b border-outline-variant/10 pb-10 sm:mb-12 sm:pb-12">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-4 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
              {course.level} | {course.tier} Plan
            </p>
            <h1 className="text-4xl font-headline font-light text-on-surface sm:text-5xl lg:text-6xl">{course.title}</h1>
          </div>
        </div>
        <p className="max-w-3xl text-base font-light italic leading-relaxed text-on-surface-variant sm:text-lg">&quot;{course.description}&quot;</p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="w-full space-y-6 lg:w-96 lg:space-y-8">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="space-y-4">
              <button
                onClick={() => {
                  setActiveModuleIdx(moduleIndex);
                  setActiveLessonIdx(0);
                }}
                className={`block w-full rounded-2xl border p-6 text-left transition-all ${
                  activeModuleIdx === moduleIndex
                    ? 'border-secondary bg-surface-container-high text-secondary'
                    : 'border-outline-variant/5 bg-surface-container/20 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <p className="mb-1 font-label text-[8px] uppercase tracking-widest opacity-40">Modulo {moduleIndex + 1}</p>
                <p className="text-lg font-headline">{module.title}</p>
              </button>

              {activeModuleIdx === moduleIndex && (
                <div className="space-y-2 border-l border-secondary/20 pl-6">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonIdx(lessonIndex)}
                      className={`w-full rounded-xl p-4 text-left text-xs font-light transition-all ${
                        activeLessonIdx === lessonIndex
                          ? 'border border-secondary/20 bg-secondary/10 text-secondary'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {lessonIndex + 1}. {lesson.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-[28px] border border-outline-variant/10 p-6 shadow-2xl glass-panel sm:rounded-[40px] sm:p-10 lg:p-16">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-secondary/5 blur-[100px]" />

          {currentLesson ? (
            <article className="animate-fade-in">
              <p className="mb-4 font-label text-[10px] uppercase tracking-widest text-secondary">Leccion {activeLessonIdx + 1}</p>
              <h2 className="mb-6 text-4xl font-headline text-on-surface">{currentLesson.title}</h2>

              <div className="mb-10 flex flex-wrap gap-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                <span>Modulo: {currentModule?.title}</span>
                <span>Duracion: {currentLesson.duration || 'Lectura guiada'}</span>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-secondary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-6 shadow-[0_36px_120px_-64px_rgba(233,193,118,0.55)] sm:p-8 lg:p-10">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-secondary/35 to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
                <LessonContent content={currentLesson.content} lessonTitle={currentLesson.title} />
              </div>

              <div className="mt-10 rounded-3xl border border-outline-variant/10 bg-surface-container/20 p-6">
                <p className="mb-2 font-label text-[10px] uppercase tracking-widest text-secondary">Cierre de curso</p>

                {state?.passed ? (
                  <p className="text-sm text-green-300">Curso marcado como completado. Este cierre es opcional y no condiciona el acceso a otros cursos.</p>
                ) : isLastLesson ? (
                  <p className="text-sm text-on-surface-variant">Cuando termines esta leccion puedes marcar el curso como completado si quieres dejar constancia de cierre.</p>
                ) : (
                  <p className="text-sm text-on-surface-variant">Puedes recorrer el curso libremente. Si quieres, al terminar la ultima leccion podras marcarlo como completado.</p>
                )}

                <div className="mt-5 flex flex-wrap gap-4">
                  {!state?.passed && isLastLesson && (
                    <button
                      type="button"
                      onClick={markCourseComplete}
                      disabled={completing}
                      className="rounded-2xl bg-secondary px-8 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-secondary disabled:opacity-40"
                    >
                      {completing ? 'Guardando...' : 'Marcar curso como completado'}
                    </button>
                  )}
                  <Link
                    href="/academy"
                    className="rounded-2xl bg-surface-container-high px-8 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface"
                  >
                    Volver al campus
                  </Link>
                </div>

                {courseError && <p className="mt-4 text-sm text-secondary">{courseError}</p>}
              </div>
            </article>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-30">
              <AppIcon name="school" size={64} className="mb-6" />
              <p className="text-2xl font-headline">Selecciona una leccion para comenzar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
