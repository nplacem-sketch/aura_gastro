'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import LockedContentOverlay from '@/components/LockedContentOverlay';
import PlansPopup from '@/components/PlansPopup';
import { canAccessTier } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';
import { recipesDb } from '@/lib/supabase';
import { normalizeDisplayText } from '@/lib/text';

type RecipeCard = {
  id: string;
  title: string;
  description: string | null;
  tier: string;
  prep_time: string | null;
  difficulty: string | null;
  created_at: string;
};

export default function RecipesPage() {
  const { plan, role } = useAuth();
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockedTier, setLockedTier] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipes() {
      const { data } = await recipesDb()
        .from('recipes')
        .select('id,title,description,tier,prep_time,difficulty,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      setRecipes((data as RecipeCard[] | null) ?? []);
      setLoading(false);
    }

    void fetchRecipes();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse p-20 text-center font-label text-xs uppercase tracking-[0.5em] text-secondary">
        Sincronizando recetario maestro...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <header className="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row">
        <div>
          <p className="mb-2 font-label text-xs uppercase tracking-[0.3em] text-secondary">
            Creatividad culinaria
          </p>
          <h1 className="text-5xl font-headline font-light tracking-tight text-on-surface">
            Recetario <span className="font-normal italic text-secondary">Maestro</span>
          </h1>
        </div>
        <button className="glass-panel group flex items-center gap-2 rounded-lg border border-secondary/20 px-6 py-3 font-label text-[10px] uppercase tracking-widest text-secondary transition-all hover:bg-secondary/10">
          Nueva creacion
          <AppIcon name="add" size={16} className="transition-transform group-hover:rotate-90" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
        {recipes.length > 0 ? (
          recipes.map((recipe) => {
            const canAccess = canAccessTier(plan, recipe.tier, role);

            return (
              <article
                key={recipe.id}
                className={`group relative overflow-hidden rounded-2xl border glass-panel ${
                  canAccess ? 'border-outline-variant/10 hover:border-secondary/30' : 'border-outline-variant/10 opacity-80'
                }`}
              >
                {canAccess ? (
                  <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-40" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLockedTier(recipe.tier)}
                    className="absolute inset-0 z-40"
                    aria-label={`Ver planes para ${recipe.title}`}
                  />
                )}

                <div className="relative min-h-[240px] bg-gradient-to-br from-[#191c1a] via-[#151816] to-[#101211] p-8">
                  <div className="absolute inset-0 opacity-70">
                    <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                  </div>

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-8 flex items-start justify-between gap-4">
                      <span
                        className={`rounded-md px-2 py-0.5 font-label text-[8px] uppercase tracking-widest ${
                          recipe.tier === 'PREMIUM'
                            ? 'bg-secondary text-on-secondary'
                            : recipe.tier === 'PRO'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-surface-container-highest text-on-surface'
                        }`}
                      >
                        {recipe.tier}
                      </span>
                      <div className="rounded-full border border-outline-variant/10 bg-black/10 p-3 text-secondary/70">
                        <AppIcon name="menu_book" size={18} />
                      </div>
                    </div>

                    {!canAccess && (
                      <LockedContentOverlay
                        tier={recipe.tier}
                        title="Receta reservada"
                        description="Esta elaboracion pertenece a un plan superior. Al tocarla podras suscribirte desde el popup."
                      />
                    )}

                    <h3 className="mb-4 font-headline text-2xl leading-tight text-on-surface transition-colors group-hover:text-secondary">
                      {normalizeDisplayText(recipe.title)}
                    </h3>
                    <p className="mb-8 line-clamp-3 text-sm font-light text-on-surface-variant">
                      {normalizeDisplayText(recipe.description) || 'Ficha culinaria lista para produccion y servicio.'}
                    </p>

                    <div className="mt-auto flex items-center justify-between border-t border-outline-variant/10 pt-6 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1.5">
                          <AppIcon name="schedule" size={14} />
                          {recipe.prep_time || 'Artesanal'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AppIcon name="stairs" size={14} />
                          {recipe.difficulty || 'Maestro'}
                        </span>
                      </div>
                      <AppIcon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-outline-variant/10 py-32 text-center md:col-span-3">
            <AppIcon
              name="menu_book"
              size={36}
              className="mx-auto mb-4 text-on-surface-variant/20"
              aria-label="Recetario"
            />
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              El recetario esta vacio. Comienza tu primera creacion.
            </p>
          </div>
        )}
      </div>

      <PlansPopup open={Boolean(lockedTier)} onClose={() => setLockedTier(null)} requiredTier={lockedTier ?? 'PRO'} />
    </div>
  );
}
