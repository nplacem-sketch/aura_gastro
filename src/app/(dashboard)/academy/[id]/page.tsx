'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import AppIcon from '@/components/AppIcon';
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

type ExamQuestion = {
  question: string;
  options?: string[];
  correct_index?: number;
};

type CourseState = {
  unlockedByOrder: boolean;
  attemptsUsed: number;
  paymentRequired: boolean;
  passed: boolean;
  lockedUntil?: string | null;
  premiumLocked?: boolean;
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, role } = useAuth();
  const [course, setCourse] = useState<Record<string, any> | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [exam, setExam] = useState<ExamQuestion[]>([]);
  const [state, setState] = useState<CourseState | null>(null);
  const [nextCourse, setNextCourse] = useState<Record<string, any> | null>(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [showExam, setShowExam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setExam([]);
        setState(data.state ?? null);
        setCourseError(data.error ?? 'No se pudo cargar el curso.');
        setLoading(false);
        return;
      }

      setCourse(data.course ?? null);
      setModules(data.modules ?? []);
      setExam(data.exam ?? []);
      setState(data.state ?? null);
      setNextCourse(data.nextCourse ?? null);
      setLoading(false);
    }

    if (session?.access_token && id) {
      void fetchCourse();
    }
  }, [id, session?.access_token]);

  const currentModule = modules[activeModuleIdx];
  const currentLesson = currentModule?.lessons[activeLessonIdx];
  const isOrderLocked = role !== 'ADMIN' && state ? !state.unlockedByOrder : false;

  const renderedBlocks = useMemo(() => {
    if (!currentLesson?.content) return [];
    return currentLesson.content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [currentLesson?.content]);

  async function submitExam() {
    if (!session?.access_token) return;
    setSubmitting(true);
    setResult(null);

    const orderedAnswers = exam.map((_, index) => answers[index] ?? -1);
    const res = await fetch(`/api/academy/course/${id}/submit-exam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ answers: orderedAnswers }),
    });

    const data = await res.json();
    setResult(data);
    setState((prev) =>
      prev
        ? {
            ...prev,
            attemptsUsed: data.attempts ?? prev.attemptsUsed,
            paymentRequired: Boolean(data.paymentRequired),
            passed: Boolean(data.passed),
            lockedUntil: data.lockedUntil ?? prev.lockedUntil,
          }
        : prev,
    );
    setSubmitting(false);
  }

  function retryExam() {
    setAnswers({});
    setResult(null);
  }

  async function startUnlockCheckout() {
    if (!session?.access_token) return;
    const res = await fetch(`/api/academy/course/${id}/unlock-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  if (loading) {
    return <div className="p-20 text-center animate-pulse text-secondary uppercase tracking-widest font-label">Sincronizando archivos maestros...</div>;
  }

  if (!course) {
    return <div className="p-20 text-center text-on-surface-variant">{courseError || 'Curso no encontrado.'}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-16 sm:pb-20">
      <header className="mb-10 border-b border-outline-variant/10 pb-10 sm:mb-12 sm:pb-12">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">
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
                  setShowExam(false);
                }}
                className={`w-full p-6 block text-left rounded-2xl border transition-all ${
                  activeModuleIdx === moduleIndex && !showExam
                    ? 'bg-surface-container-high border-secondary text-secondary'
                    : 'bg-surface-container/20 border-outline-variant/5 text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <p className="font-label text-[8px] uppercase tracking-widest mb-1 opacity-40">Módulo {moduleIndex + 1}</p>
                <p className="font-headline text-lg">{module.title}</p>
              </button>

              {activeModuleIdx === moduleIndex && !showExam && (
                <div className="pl-6 space-y-2 border-l border-secondary/20">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonIdx(lessonIndex)}
                      className={`w-full p-4 rounded-xl text-left text-xs font-light transition-all ${
                        activeLessonIdx === lessonIndex
                          ? 'bg-secondary/10 text-secondary border border-secondary/20'
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

          {exam.length > 0 && (
            <button
              onClick={() => setShowExam(true)}
              className={`w-full p-6 text-left rounded-2xl border transition-all ${
                showExam
                  ? 'bg-secondary/10 border-secondary text-secondary'
                  : 'bg-surface-container/20 border-outline-variant/5 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <p className="font-label text-[8px] uppercase tracking-widest mb-1 opacity-40">Evaluación final</p>
              <p className="font-headline text-lg">Examen del curso</p>
              <p className="text-[10px] uppercase tracking-widest mt-3 opacity-50">{exam.length} preguntas</p>
            </button>
          )}
        </div>

        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-[28px] border border-outline-variant/10 glass-panel p-6 shadow-2xl sm:rounded-[40px] sm:p-10 lg:p-16">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 blur-[100px] pointer-events-none" />

          {isOrderLocked && (
            <div className="absolute inset-0 z-40 backdrop-blur-xl bg-[#121413]/70 flex flex-col items-center justify-center p-12 text-center">
              <AppIcon name="lock" size={52} className="text-secondary mb-6" />
              <h2 className="text-3xl font-headline text-on-surface mb-4">Debes seguir el orden del campus</h2>
              <p className="text-sm text-on-surface-variant max-w-md mb-8">
                Completa el curso anterior o desbloquea el avance para continuar con este contenido.
              </p>
              <Link href="/academy" className="bg-secondary text-on-secondary px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold">
                Volver a Academia
              </Link>
            </div>
          )}

          {!showExam && currentLesson ? (
            <article className="animate-fade-in">
              <p className="font-label text-secondary text-[10px] uppercase tracking-widest mb-4">Lección {activeLessonIdx + 1}</p>
              <h2 className="text-4xl font-headline text-on-surface mb-6">{currentLesson.title}</h2>
              <div className="flex flex-wrap gap-4 mb-10 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                <span>Módulo: {currentModule?.title}</span>
                <span>Duración: {currentLesson.duration || 'Lectura guiada'}</span>
              </div>

              <div className="prose prose-invert max-w-none prose-p:text-on-surface-variant prose-p:leading-[1.9] prose-headings:text-on-surface prose-strong:text-on-surface">
                {renderedBlocks.map((block, index) =>
                  block.startsWith('## ') ? (
                    <h3 key={index} className="font-label text-secondary text-[10px] uppercase tracking-widest mt-10 mb-3">
                      {block.replace(/^##\s*/, '')}
                    </h3>
                  ) : (
                    <p key={index}>{block}</p>
                  ),
                )}
              </div>
            </article>
          ) : showExam ? (
            <section className="animate-fade-in">
              <p className="font-label text-secondary text-[10px] uppercase tracking-widest mb-4">Evaluación final</p>
              <h2 className="text-4xl font-headline text-on-surface mb-4">Examen del curso</h2>
              <p className="text-on-surface-variant font-light leading-relaxed mb-6">
                Debes alcanzar al menos el 60% de aciertos. Tienes tres intentos. En los dos primeros solo verás tu porcentaje total y podrás decidir si quieres reintentar.
              </p>

              <div className="mb-8 p-6 rounded-3xl bg-surface-container/20 border border-outline-variant/10">
                <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Estado del examen</p>
                <p className="text-sm text-on-surface-variant">Intentos usados: {state?.attemptsUsed ?? 0} / 3</p>
                {result && <p className="text-sm text-on-surface mt-2">Resultado del intento: {result.percentage}% de respuestas correctas</p>}
                {state?.passed && <p className="text-sm text-green-300 mt-2">Curso superado. Ya puedes continuar con el siguiente.</p>}
                {!state?.passed && state?.paymentRequired && state?.lockedUntil && (
                  <p className="text-sm text-secondary mt-2">
                    Si no realizas el pago, la academia premium queda bloqueada hasta {new Date(state.lockedUntil).toLocaleDateString('es-ES')}.
                  </p>
                )}
              </div>

              <div className="space-y-8">
                {exam.map((item, index) => (
                  <div key={`${index}-${item.question}`} className="p-6 rounded-3xl border border-outline-variant/10 bg-surface-container/20">
                    <p className="font-label text-[10px] uppercase tracking-widest text-secondary mb-3">Pregunta {index + 1}</p>
                    <h3 className="text-xl font-headline text-on-surface mb-4">{item.question}</h3>
                    <div className="space-y-2">
                      {(item.options || []).map((option, optionIndex) => {
                        const isSelected = answers[index] === optionIndex;
                        return (
                          <button
                            key={`${optionIndex}-${option}`}
                            type="button"
                            disabled={Boolean(state?.passed) || Boolean(result)}
                            onClick={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                            className={`w-full text-left px-4 py-3 rounded-2xl border text-sm transition-all ${
                              isSelected
                                ? 'border-secondary/40 bg-secondary/10 text-on-surface'
                                : 'border-outline-variant/10 bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                {!state?.passed && !state?.paymentRequired && !result && (
                  <button
                    type="button"
                    onClick={submitExam}
                    disabled={submitting || Object.keys(answers).length !== exam.length}
                    className="bg-secondary text-on-secondary px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-40"
                  >
                    {submitting ? 'Evaluando...' : 'Finalizar intento'}
                  </button>
                )}

                {!state?.passed && !state?.paymentRequired && result && (
                  <>
                    <p className="text-sm text-on-surface-variant self-center">¿Quieres volver a intentarlo?</p>
                    <button
                      type="button"
                      onClick={retryExam}
                      className="bg-secondary text-on-secondary px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExam(false)}
                      className="bg-surface-container-high text-on-surface px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold"
                    >
                      No
                    </button>
                  </>
                )}

                {state?.paymentRequired && !state?.passed && (
                  <button
                    type="button"
                    onClick={startUnlockCheckout}
                    className="bg-primary text-black px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold"
                  >
                    Pagar 1,50 EUR para desbloquear el siguiente curso
                  </button>
                )}

                {state?.passed && nextCourse && (
                  <Link
                    href={`/academy/${nextCourse.id}`}
                    className="bg-surface-container-high text-on-surface px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold"
                  >
                    Ir al siguiente curso
                  </Link>
                )}
              </div>

              {state?.paymentRequired && Array.isArray(result?.review) && result.review.length > 0 && (
                <div className="mt-10 p-8 rounded-3xl border border-secondary/20 bg-secondary/5">
                  <p className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4">Revisión final del intento</p>
                  <div className="space-y-6">
                    {result.review.map((item: any, index: number) => (
                      <div key={`${index}-${item.question}`} className="border-b border-outline-variant/10 pb-5 last:border-none last:pb-0">
                        <p className="text-sm text-on-surface mb-2">{index + 1}. {item.question}</p>
                        <p className="text-xs text-on-surface-variant">
                          Tu respuesta: {item.selectedIndex >= 0 ? `${String.fromCharCode(65 + item.selectedIndex)}. ${item.options[item.selectedIndex]}` : 'Sin responder'}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          Respuesta correcta: {item.correctIndex >= 0 ? `${String.fromCharCode(65 + item.correctIndex)}. ${item.options[item.correctIndex]}` : 'No disponible'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
              <AppIcon name="school" size={64} className="mb-6" />
              <p className="font-headline text-2xl">Selecciona una lección para comenzar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
