'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';
import { academyDb, labDb, recipesDb } from '@/lib/supabase';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({ courses: 0, ingredients: 0, recipes: 0 });
  const [latestCourses, setLatestCourses] = useState<any[]>([]);
  const [latestRecipes, setLatestRecipes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const withTimeout = (promise: Promise<any>, timeoutMs: number, fallback: any) =>
          Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs))]);

        const [coursesRes, ingredientsRes, recipesCountRes, coursesList, recipesList, plansRes] = await Promise.all([
          withTimeout(Promise.resolve(academyDb().from('courses').select('id', { count: 'exact', head: true }).then((r) => r, (e) => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(labDb().from('ingredients').select('id', { count: 'exact', head: true }).then((r) => r, (e) => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(recipesDb().from('recipes').select('id', { count: 'exact', head: true }).then((r) => r, (e) => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(academyDb().from('courses').select('id,title,level').limit(4).order('created_at', { ascending: false }).then((r) => r, (e) => ({ data: [], error: e }))), 3000, { data: [] }),
          withTimeout(Promise.resolve(recipesDb().from('recipes').select('id,title,cover_image,difficulty,is_premium,created_at').limit(3).order('created_at', { ascending: false }).then((r) => r, (e) => ({ data: [], error: e }))), 3000, { data: [] }),
          withTimeout(fetch('/api/plans', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ plans: [] })), 3000, { plans: [] }),
        ]);

        setStats({
          courses: coursesRes.count ?? 0,
          ingredients: ingredientsRes.count ?? 0,
          recipes: recipesCountRes.count ?? 0,
        });
        setLatestCourses(coursesList.data ?? []);
        setLatestRecipes(recipesList.data ?? []);
        setPlans(plansRes.plans ?? []);
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err);
      }
    }

    if (!loading) void fetchData();
  }, [loading]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><span className="animate-pulse font-label text-secondary">Sincronizando Perfil Maestro...</span></div>;
  }

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = `${today.charAt(0).toUpperCase() + today.slice(1)} | ${time}`;

  return (
    <div className="mx-auto max-w-6xl pb-12 font-body">
      <header className="mb-8 sm:mb-10">
        <h1 className="mb-2 text-3xl font-headline font-normal tracking-wide text-on-surface sm:text-4xl">Panel Maestro</h1>
        <p className="mb-1 text-base font-light text-[#e2e3e0]/90 sm:text-lg">
          Bienvenido de nuevo, Chef {user?.user_metadata?.full_name?.split(' ')[0] || 'Aura'}.
        </p>
        <p className="text-xs font-light text-on-surface-variant/60">{formattedDate}</p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-[24px] border border-outline-variant/10 bg-gradient-to-br from-[#1a231f] to-[#121413] p-5 shadow-2xl sm:p-7">
          <div className="absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 blur-[1px]" />
          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <h2 className="text-base font-headline tracking-wide text-on-surface sm:text-lg">Estadisticas de Vanguardia</h2>
            <AppIcon name="more_horiz" size={20} className="cursor-pointer text-on-surface-variant" />
          </div>

          <div className="space-y-5 sm:space-y-6">
            {[
              { icon: 'school', title: 'Cursos Activos', value: stats.courses, extra: '| Nuevos anadidos', extraClass: 'text-primary' },
              { icon: 'biotech', title: 'Ingredientes Premium', value: stats.ingredients, extra: '| En laboratorio', extraClass: 'text-on-surface-variant' },
              { icon: 'menu_book', title: 'Recetas Exclusivas', value: stats.recipes, extra: '| Registradas', extraClass: 'text-on-surface-variant' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant/10 bg-[#232b27] sm:h-12 sm:w-12">
                  <AppIcon name={item.icon as any} className={item.icon === 'biotech' ? 'text-secondary' : 'text-on-surface-variant'} size={20} />
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-on-surface-variant">{item.title}</p>
                  <p className="text-base font-headline text-on-surface sm:text-lg">
                    {item.value} <span className={`ml-1 text-[11px] font-body font-light tracking-wide ${item.extraClass}`}>{item.extra}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-outline-variant/10 bg-gradient-to-br from-[#1a231f] to-[#121413] p-5 shadow-2xl sm:p-7">
          <div className="absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 blur-[1px]" />

          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <h2 className="text-base font-headline tracking-wide text-on-surface sm:text-lg">Academia de Vanguardia</h2>
            <Link href="/academy" className="text-xs text-secondary transition-all hover:underline">Ver todos</Link>
          </div>

          <div className="flex-1 space-y-5 sm:space-y-6">
            {latestCourses.length > 0 ? latestCourses.map((course, idx) => {
              const progress = [75, 40, 15, 0][idx % 4] || 0;
              const color = progress > 50 ? 'from-secondary/50 to-secondary' : 'from-primary/50 to-primary';
              const shadow = progress > 50 ? 'rgba(233,193,118,0.5)' : 'rgba(175,205,195,0.5)';

              return (
                <div key={course.id}>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-light text-on-surface">{course.title}</p>
                    <span className="shrink-0 text-xs text-on-surface-variant">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#232b27]">
                    <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${progress}%`, boxShadow: `0 0 8px ${shadow}` }} />
                  </div>
                </div>
              );
            }) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-outline-variant/20 text-sm text-on-surface-variant/50">
                Sin cursos inscritos.
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[24px] border border-outline-variant/10 bg-gradient-to-br from-[#1a231f] via-[#121413] to-[#121413] p-5 shadow-2xl sm:p-7">
        <div className="absolute left-20 right-20 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 blur-[1px]" />

        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/5 pb-4 sm:mb-8">
          <h2 className="text-base font-headline tracking-wide text-on-surface sm:text-lg">Recetario Reciente</h2>
          <Link href="/recipes" className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-secondary hover:underline">
            Ver todas <AppIcon name="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {latestRecipes.length > 0 ? latestRecipes.map((recipe: any) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group relative aspect-[16/10] overflow-hidden rounded-[16px] border border-outline-variant/10 bg-[#1a1c1b]">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#121413] via-[#121413]/60 to-transparent transition-colors group-hover:via-[#121413]/40" />
              {recipe.cover_image && (
                <Image
                  src={recipe.cover_image}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-40 grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                  unoptimized
                />
              )}
              <div className="absolute bottom-0 z-20 w-full p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap gap-2">
                  {recipe.is_premium && <span className="rounded-md border border-secondary/30 bg-secondary/20 px-2 py-0.5 text-[8px] font-label uppercase tracking-widest text-secondary backdrop-blur-md">Premium</span>}
                  <span className="rounded-md bg-surface-container-highest/80 px-2 py-0.5 text-[8px] font-label uppercase tracking-widest text-on-surface backdrop-blur-md">{recipe.difficulty}</span>
                </div>
                <h4 className="line-clamp-2 text-base leading-tight text-on-surface transition-colors group-hover:text-secondary sm:text-lg">{recipe.title}</h4>
              </div>
            </Link>
          )) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-outline-variant/20 bg-[#161817] py-16 md:col-span-3">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Sincronizando recetas desde el nucleo...</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative mt-8 overflow-hidden rounded-[24px] border border-outline-variant/10 bg-gradient-to-br from-[#1a231f] via-[#121413] to-[#121413] p-5 shadow-2xl sm:p-7">
        <div className="absolute left-20 right-20 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 blur-[1px]" />
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/5 pb-4 sm:mb-8">
          <h2 className="text-base font-headline tracking-wide text-on-surface sm:text-lg">Planes Aura</h2>
          <Link href="/plans" className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-secondary hover:underline">
            Ver comparativa <AppIcon name="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-[20px] border p-5 sm:p-6 ${plan.name === 'PREMIUM' ? 'border-secondary/40 bg-secondary/5' : 'border-outline-variant/10 bg-surface-container-high/30'}`}>
              <p className="mb-3 font-label text-[10px] uppercase tracking-[0.3em] text-secondary">{plan.name}</p>
              <p className="mb-2 text-2xl font-headline text-on-surface sm:text-3xl">{Number(plan.price_monthly_eur || 0) === 0 ? 'Gratis' : `${plan.price_monthly_eur} EUR`}</p>
              <p className="mb-5 text-sm font-light text-on-surface-variant">{plan.description}</p>
              <div className="space-y-2 text-xs text-on-surface-variant">
                {(plan.features?.bullets || []).slice(0, 4).map((feature: string) => (
                  <p key={feature}>• {feature}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
