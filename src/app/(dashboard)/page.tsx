'use client';

import { useAuth } from '@/lib/auth-context';
import { recipesDb, labDb, academyDb } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppIcon from '@/components/AppIcon';

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
          Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(fallback), timeoutMs))
          ]);

        const [coursesRes, ingredientsRes, recipesCountRes, coursesList, recipesList, plansRes] = await Promise.all([
          withTimeout(Promise.resolve(academyDb().from('courses').select('id', { count: 'exact', head: true }).then(r => r, e => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(labDb().from('ingredients').select('id', { count: 'exact', head: true }).then(r => r, e => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(recipesDb().from('recipes').select('id', { count: 'exact', head: true }).then(r => r, e => ({ count: 0, error: e }))), 3000, { count: 0 }),
          withTimeout(Promise.resolve(academyDb().from('courses').select('id,title,level').limit(4).order('created_at', { ascending: false }).then(r => r, e => ({ data: [], error: e }))), 3000, { data: [] }),
          withTimeout(Promise.resolve(recipesDb().from('recipes').select('id,title,cover_image,difficulty,is_premium,created_at').limit(3).order('created_at', { ascending: false }).then(r => r, e => ({ data: [], error: e }))), 3000, { data: [] }),
          withTimeout(fetch('/api/plans', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ plans: [] })), 3000, { plans: [] }),
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

    if (!loading) fetchData();
  }, [loading]);

  if (loading) return <div className="flex items-center justify-center h-full"><span className="animate-pulse text-secondary font-label">Sincronizando Perfil Maestro...</span></div>;

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = `${today.charAt(0).toUpperCase() + today.slice(1)} | ${time}`;

  return (
    <div className="max-w-6xl mx-auto pb-12 font-body">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-headline font-normal tracking-wide text-on-surface mb-2">Panel Maestro</h1>
        <p className="text-[#e2e3e0]/90 text-lg font-light mb-1">
          ¡Bienvenido de nuevo, Chef {user?.user_metadata?.full_name?.split(' ')[0] || 'Aura'}!
        </p>
        <p className="text-on-surface-variant/60 text-xs font-light">
          {formattedDate}
        </p>
      </header>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Estadísticas de Vanguardia */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a231f] to-[#121413] border border-outline-variant/10 p-7 shadow-2xl">
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 blur-[1px]"></div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg text-on-surface font-headline tracking-wide">Estadísticas de Vanguardia</h2>
            <AppIcon name="more_horiz" size={20} className="text-on-surface-variant cursor-pointer" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#232b27] border border-outline-variant/10 flex items-center justify-center">
                <AppIcon name="school" className="text-on-surface-variant" size={22} />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Cursos Activos</p>
                <p className="text-on-surface font-headline text-lg">
                  {stats.courses} <span className="text-xs font-body font-light text-primary tracking-wide ml-1">| Nuevos Añadidos</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#232b27] border border-outline-variant/10 flex items-center justify-center">
                <AppIcon name="biotech" className="text-secondary" size={22} />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Ingredientes Premium</p>
                <p className="text-on-surface font-headline text-lg">
                  {stats.ingredients} <span className="text-xs font-body font-light text-on-surface-variant tracking-wide ml-1">| En Laboratorio</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#232b27] border border-outline-variant/10 flex items-center justify-center">
                <AppIcon name="menu_book" className="text-on-surface-variant" size={22} />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Recetas Exclusivas</p>
                <p className="text-on-surface font-headline text-lg">
                  {stats.recipes} <span className="text-xs font-body font-light text-on-surface-variant tracking-wide ml-1">| Registradas</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Academia de Vanguardia (Dynamic) */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a231f] to-[#121413] border border-outline-variant/10 p-7 shadow-2xl flex flex-col">
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 blur-[1px]"></div>
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg text-on-surface font-headline tracking-wide">Academia de Vanguardia</h2>
            <Link href="/academy" className="text-xs text-secondary hover:underline transition-all">Ver todos</Link>
          </div>

          <div className="space-y-6 flex-1">
            {latestCourses.length > 0 ? latestCourses.map((course, idx) => {
              // Simulated dynamic progress for demo
              const progress = [75, 40, 15, 0][idx % 4] || 0;
              const color = progress > 50 ? 'from-secondary/50 to-secondary' : 'from-primary/50 to-primary';
              const shadow = progress > 50 ? 'rgba(233,193,118,0.5)' : 'rgba(175,205,195,0.5)';
              
              return (
                <div key={course.id}>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm text-on-surface font-light line-clamp-1">{course.title}</p>
                    <span className="text-xs text-on-surface-variant shrink-0 ml-4">{progress}%</span>
                  </div>
                  <div className="h-2 bg-[#232b27] rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${color} rounded-full`} 
                      style={{ width: `${progress}%`, boxShadow: `0 0 8px ${shadow}` }}
                    ></div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex items-center justify-center h-full text-sm text-on-surface-variant/50 border border-dashed border-outline-variant/20 rounded-xl">
                 Sin cursos inscritos.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recetario Maestro Reciente (Replacing Sommelier Chat) */}
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a231f] via-[#121413] to-[#121413] border border-outline-variant/10 p-7 shadow-2xl">
        <div className="absolute top-0 left-20 right-20 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 blur-[1px]"></div>
        
        <div className="flex items-center justify-between mb-8 border-b border-outline-variant/5 pb-4">
          <h2 className="text-lg text-on-surface font-headline tracking-wide">Recetario Reciente</h2>
          <Link href="/recipes" className="font-label text-[10px] text-secondary uppercase tracking-widest hover:underline flex items-center gap-2">
            Ver todas <AppIcon name="arrow_forward" size={14} />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestRecipes.length > 0 ? latestRecipes.map((recipe: any) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group cursor-pointer relative rounded-[16px] overflow-hidden aspect-[16/10] bg-[#1a1c1b] border border-outline-variant/10">
              <div className="absolute inset-0 bg-gradient-to-t from-[#121413] via-[#121413]/60 to-transparent z-10 transition-colors group-hover:via-[#121413]/40"></div>
              {recipe.cover_image && (
                <Image
                  src={recipe.cover_image}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  unoptimized
                />
              )}
              <div className="absolute bottom-0 p-5 w-full z-20">
                <div className="flex gap-2 mb-2">
                  {recipe.is_premium && <span className="px-2 py-0.5 bg-secondary/20 border border-secondary/30 text-secondary text-[8px] font-label uppercase tracking-widest rounded-md backdrop-blur-md">Premium</span>}
                  <span className="px-2 py-0.5 bg-surface-container-highest/80 text-on-surface text-[8px] font-label uppercase tracking-widest rounded-md backdrop-blur-md">{recipe.difficulty}</span>
                </div>
                <h4 className="font-headline text-lg leading-tight text-on-surface group-hover:text-secondary transition-colors line-clamp-2">{recipe.title}</h4>
              </div>
            </Link>
          )) : (
            <div className="md:col-span-3 py-16 flex items-center justify-center border border-dashed border-outline-variant/20 rounded-2xl bg-[#161817]">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Sincronizando recetas desde el núcleo...</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a231f] via-[#121413] to-[#121413] border border-outline-variant/10 p-7 shadow-2xl mt-8">
        <div className="absolute top-0 left-20 right-20 h-px bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 blur-[1px]"></div>
        <div className="flex items-center justify-between mb-8 border-b border-outline-variant/5 pb-4">
          <h2 className="text-lg text-on-surface font-headline tracking-wide">Planes Aura</h2>
          <Link href="/plans" className="font-label text-[10px] text-secondary uppercase tracking-widest hover:underline flex items-center gap-2">
            Ver comparativa <AppIcon name="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-[20px] border p-6 ${plan.name === 'PREMIUM' ? 'border-secondary/40 bg-secondary/5' : 'border-outline-variant/10 bg-surface-container-high/30'}`}>
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary mb-3">{plan.name}</p>
              <p className="text-3xl font-headline text-on-surface mb-2">{Number(plan.price_monthly_eur || 0) === 0 ? 'Gratis' : `${plan.price_monthly_eur} EUR`}</p>
              <p className="text-sm text-on-surface-variant font-light mb-5">{plan.description}</p>
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
