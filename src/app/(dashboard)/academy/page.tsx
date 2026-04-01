'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import LockedContentOverlay from '@/components/LockedContentOverlay';
import PlansPopup from '@/components/PlansPopup';
import { canAccessTier } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';

type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  tier: string;
  unlockedByOrder: boolean;
  passed: boolean;
  lockedUntil?: string | null;
  premiumLocked?: boolean;
};

export default function AcademyPage() {
  const { session, plan, role } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockedTier, setLockedTier] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      const res = await fetch('/api/academy/catalog', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        cache: 'no-store',
      });

      const data = await res.json();
      setCourses(data.courses ?? []);
      setLoading(false);
    }

    if (session?.access_token) {
      void fetchCourses();
    }
  }, [session?.access_token]);

  if (loading) {
    return <div className="animate-pulse p-12 text-center font-label text-xs uppercase tracking-[0.5em] text-secondary sm:p-20">Sincronizando Campus Aura...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <header className="mb-10 sm:mb-16">
        <p className="mb-4 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">Formacion de Vanguardia</p>
        <h1 className="text-4xl font-headline font-light text-on-surface underline decoration-secondary/20 decoration-4 underline-offset-4 sm:text-6xl sm:decoration-8 sm:underline-offset-8">
          Campus <span className="italic text-secondary">Aura</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-10">
        {courses.map((course, index) => {
          const blockedByPlan = !canAccessTier(plan, course.tier, role);

          return (
            <div
              key={course.id}
              className={`glass-panel group flex flex-col overflow-hidden rounded-[28px] border border-outline-variant/10 transition-all duration-500 sm:rounded-[40px] ${
                !blockedByPlan ? 'hover:border-secondary/40' : 'opacity-90'
              }`}
            >
              <div className="relative h-48 overflow-hidden bg-surface-container-high sm:h-64">
                {blockedByPlan ? (
                  <button
                    type="button"
                    onClick={() => setLockedTier(course.tier)}
                    className="absolute inset-0 z-40"
                    aria-label={`Ver planes para abrir ${course.title}`}
                  />
                ) : (
                  <Link href={`/academy/${course.id}`} className="absolute inset-0 z-40" aria-label={`Abrir ${course.title}`} />
                )}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-surface via-transparent to-transparent" />
                <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-label uppercase tracking-widest shadow-xl sm:px-4 sm:py-1.5 ${course.tier === 'PREMIUM' ? 'border-secondary bg-secondary text-black' : course.tier === 'PRO' ? 'border-primary/40 bg-primary/20 text-primary' : 'border-transparent bg-surface-container-highest text-on-surface-variant'}`}>
                    {course.tier}
                  </span>
                </div>

                {blockedByPlan ? (
                  <LockedContentOverlay
                    tier={course.tier}
                    title="Curso reservado a planes superiores"
                    description="Puedes ver el campus completo, pero este curso solo se abre al activar la membresia indicada."
                  />
                ) : null}
              </div>

              <div className="relative flex flex-1 flex-col p-6 sm:p-8 md:p-10">
                <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                  <span className="text-[10px] font-label font-bold uppercase tracking-[0.3em] text-secondary">Curso {index + 1}</span>
                  {course.passed && <span className="text-[9px] uppercase tracking-widest text-green-300">Completado</span>}
                </div>

                <h3 className="mb-4 text-xl leading-tight text-on-surface transition-colors group-hover:text-secondary sm:text-2xl">{course.title}</h3>
                <p className="mb-6 flex-1 line-clamp-3 text-sm font-light leading-relaxed text-on-surface-variant">{course.description}</p>

                <div className="mb-6 space-y-2 text-[10px] uppercase tracking-widest text-on-surface-variant sm:mb-8">
                  <p>{course.level || 'Master'}</p>
                  {course.premiumLocked && course.lockedUntil && (
                    <p className="text-error">Academia premium bloqueada hasta {new Date(course.lockedUntil).toLocaleDateString('es-ES')}</p>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-t border-outline-variant/5 pt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant opacity-40">Membresia requerida</span>
                    <span className="text-xs font-headline text-on-surface">Plan {course.tier}</span>
                  </div>

                  {blockedByPlan ? (
                    <button
                      type="button"
                      onClick={() => setLockedTier(course.tier)}
                      className="relative z-50 inline-flex items-center justify-center gap-3 rounded-2xl border border-[#e4ff78]/35 bg-[#e4ff78]/10 px-6 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-[#f4ffbf] shadow-[0_0_24px_rgba(228,255,120,0.14)] transition-all hover:bg-[#e4ff78]/18 sm:px-8 sm:py-4"
                    >
                      Ver planes <AppIcon name="lock_open" size={16} />
                    </button>
                  ) : (
                    <Link href={`/academy/${course.id}`} className="relative z-50 inline-flex items-center justify-center gap-3 rounded-2xl bg-surface-container-high px-6 py-3 font-label text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-secondary hover:text-black sm:px-8 sm:py-4">
                      Acceder <AppIcon name="arrow_forward" size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PlansPopup open={Boolean(lockedTier)} onClose={() => setLockedTier(null)} requiredTier={lockedTier ?? 'PRO'} />
    </div>
  );
}
