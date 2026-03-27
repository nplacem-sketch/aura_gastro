'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  tier: string;
  unlockedByOrder: boolean;
  passed: boolean;
  attemptsUsed: number;
  paymentRequired: boolean;
  lockedUntil?: string | null;
  premiumLocked?: boolean;
};

export default function AcademyPage() {
  const { session } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);

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
    return <div className="p-20 text-center font-label text-xs uppercase tracking-[0.5em] text-secondary animate-pulse">Sincronizando Campus Aura...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="mb-16">
        <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">Formacion de Vanguardia</p>
        <h1 className="text-6xl font-headline font-light text-on-surface underline decoration-secondary/20 decoration-8 underline-offset-8">
          Campus <span className="italic text-secondary">Aura</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {courses.map((course, index) => {
          const unlocked = course.unlockedByOrder;

          return (
            <div
              key={course.id}
              className={`glass-panel rounded-[40px] overflow-hidden group border border-outline-variant/10 flex flex-col transition-all duration-500 ${unlocked ? 'hover:border-secondary/40' : 'opacity-70'}`}
            >
              <div className="h-64 bg-surface-container-high relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10" />
                <div className="absolute top-6 right-6 z-20">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-label uppercase tracking-widest shadow-xl border ${course.tier === 'PREMIUM' ? 'bg-secondary text-black border-secondary' : course.tier === 'PRO' ? 'bg-primary/20 text-primary border-primary/40' : 'bg-surface-container-highest text-on-surface-variant border-transparent'}`}>
                    {course.tier}
                  </span>
                </div>

                {!unlocked && (
                  <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <AppIcon name="lock" size={32} className="text-secondary mb-4 opacity-50" />
                    <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface mb-2">Sigue el orden del campus</p>
                    <p className="text-[10px] text-on-surface-variant">Completa o desbloquea el curso anterior para avanzar.</p>
                  </div>
                )}
              </div>

              <div className="p-10 flex-1 flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-label text-secondary uppercase tracking-[0.3em] font-bold">Curso {index + 1}</span>
                  {course.passed && <span className="text-[9px] uppercase tracking-widest text-green-300">Completado</span>}
                </div>

                <h3 className="font-headline text-2xl mb-4 text-on-surface group-hover:text-secondary transition-colors leading-tight">{course.title}</h3>
                <p className="text-on-surface-variant text-sm font-light line-clamp-2 mb-6 flex-1 leading-relaxed">{course.description}</p>

                <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-8 space-y-2">
                  <p>{course.level || 'Master'}</p>
                  <p>Intentos usados: {course.attemptsUsed} / 3</p>
                  {course.paymentRequired && <p className="text-secondary">Pago pendiente de 1,50 EUR para desbloquear el siguiente curso</p>}
                  {course.premiumLocked && course.lockedUntil && (
                    <p className="text-error">Academia premium bloqueada hasta {new Date(course.lockedUntil).toLocaleDateString('es-ES')}</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-outline-variant/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-label text-on-surface-variant uppercase tracking-widest opacity-40">Membresia requerida</span>
                    <span className="text-xs font-headline text-on-surface">Plan {course.tier}</span>
                  </div>

                  {unlocked ? (
                    <Link href={`/academy/${course.id}`} className="flex items-center gap-3 bg-surface-container-high px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-black transition-all group/btn font-bold">
                      Acceder <AppIcon name="arrow_forward" size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-on-surface-variant/40 font-label text-[9px] uppercase tracking-widest">
                      Bloqueado <AppIcon name="help" size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
