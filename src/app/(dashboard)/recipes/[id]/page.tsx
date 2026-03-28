'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import PlansPopup from '@/components/PlansPopup';
import { canAccessTier } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';
import { recipesDb } from '@/lib/supabase';
import { normalizeDisplayText } from '@/lib/text';

type RecipeStep = {
  id: string;
  step_number: number;
  instruction: string;
};

type RecipeIngredient = {
  id: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
};

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { plan, role } = useAuth();
  const [recipe, setRecipe] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [showPlansPopup, setShowPlansPopup] = useState(false);

  useEffect(() => {
    async function fetchRecipeData() {
      setLoading(true);

      const [recipeRes, ingredientsRes, stepsRes] = await Promise.all([
        recipesDb().from('recipes').select('*').eq('id', id).single(),
        recipesDb().from('recipe_ingredients').select('id,name,quantity,unit').eq('recipe_id', id).order('name'),
        recipesDb().from('recipe_steps').select('id,step_number,instruction').eq('recipe_id', id).order('step_number'),
      ]);

      setRecipe(recipeRes.data ?? null);
      setIngredients((ingredientsRes.data as RecipeIngredient[] | null) ?? []);
      setSteps((stepsRes.data as RecipeStep[] | null) ?? []);
      setLoading(false);
    }

    if (id) {
      void fetchRecipeData();
    }
  }, [id]);

  const resolvedSteps = useMemo(() => {
    if (steps.length > 0) return steps.map((step) => normalizeDisplayText(step.instruction));
    if (!recipe?.steps) return [];

    try {
      const parsed = typeof recipe.steps === 'string' ? JSON.parse(recipe.steps) : recipe.steps;
      return Array.isArray(parsed)
        ? parsed
            .map((step: any) => (typeof step === 'string' ? step : step?.instruction))
            .filter(Boolean)
            .map((step: string) => normalizeDisplayText(step))
        : [];
    } catch {
      return [];
    }
  }, [recipe, steps]);

  if (loading) {
    return (
      <div className="animate-pulse p-20 text-center font-label text-xs uppercase tracking-[0.5em] text-secondary">
        Desglosando ficha tecnica...
      </div>
    );
  }

  if (!recipe) {
    return <div className="p-20 text-center text-error">Receta no encontrada.</div>;
  }

  const isLocked = !canAccessTier(plan, recipe.tier, role);

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <section className="relative mb-12 overflow-hidden rounded-3xl border border-outline-variant/10 bg-gradient-to-br from-[#181b19] via-[#141715] to-[#0f1110] p-12 shadow-2xl">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
              Protocolo gastronomico: {recipe.tier}
            </p>
            <h1 className="max-w-4xl text-5xl font-headline leading-none text-on-surface md:text-6xl">
              {normalizeDisplayText(recipe.title)}
            </h1>
            <p className="mt-6 max-w-3xl text-sm font-light leading-relaxed text-on-surface-variant">
              {normalizeDisplayText(recipe.description) || 'Ficha culinaria lista para produccion, pase y control tecnico.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border border-outline-variant/10 bg-black/10 px-6 py-5 text-center backdrop-blur-sm">
              <p className="text-2xl font-headline text-on-surface">{recipe.prep_time || 'Artesanal'}</p>
              <p className="font-label text-[8px] uppercase tracking-widest text-[#afcdc3]/40">Tiempo</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/10 bg-black/10 px-6 py-5 text-center backdrop-blur-sm">
              <p className="text-2xl font-headline text-on-surface">{recipe.difficulty || 'Maestro'}</p>
              <p className="font-label text-[8px] uppercase tracking-widest text-[#afcdc3]/40">Nivel</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <section className="relative overflow-hidden rounded-3xl border border-outline-variant/10 glass-panel p-10">
            {isLocked && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#121413]/60 p-12 text-center backdrop-blur-xl">
                <AppIcon name="lock" size={44} className="mb-6 text-secondary" aria-label="Bloqueado" />
                <h2 className="mb-4 text-2xl font-headline text-on-surface">Contenido reservado</h2>
                <p className="mb-8 max-w-sm text-sm font-light text-on-surface-variant">
                  Esta ficha tecnica contiene procesos moleculares de nivel PREMIUM. Actualiza tu suscripcion para desbloquear.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPlansPopup(true)}
                  className="rounded-xl bg-secondary px-8 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-secondary shadow-xl shadow-secondary/20"
                >
                  Actualizar plan
                </button>
              </div>
            )}

            <h3 className="mb-8 text-3xl font-headline text-on-surface">Escandallo molecular</h3>
            <div className="space-y-4">
              {ingredients.length > 0 ? (
                ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex items-center justify-between border-b border-outline-variant/5 py-4">
                    <span className="font-light text-on-surface">{normalizeDisplayText(ingredient.name)}</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-secondary">
                      {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="border-b border-outline-variant/5 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/40">
                  No se han registrado componentes tecnicos para esta creacion.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-outline-variant/10 glass-panel p-10">
            <h3 className="mb-8 text-3xl font-headline text-on-surface">Procesos de elaboracion</h3>
            <div className="space-y-10">
              {resolvedSteps.length > 0 ? (
                resolvedSteps.map((instruction, index) => (
                  <div key={`${index}-${instruction}`} className="group flex gap-8">
                    <div className="font-headline text-6xl font-black text-outline-variant/20 transition-all group-hover:text-secondary/20">
                      {index + 1}
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-light leading-relaxed text-on-surface-variant transition-colors group-hover:text-on-surface">
                        {instruction}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="italic opacity-40">Desglosando fases de elaboracion...</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="rounded-3xl border border-outline-variant/10 glass-panel p-8">
            <h4 className="mb-6 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              Registro de autoria
            </h4>
            <div className="space-y-4 text-[9px] font-label uppercase tracking-tighter text-[#afcdc3]/30">
              <p>Creada: {new Date(recipe.created_at).toLocaleDateString()}</p>
              <p>Hash: {String(recipe.id).substring(0, 12)}...</p>
              <p>Estado: VERIFIED_UNIT</p>
            </div>
          </div>
        </div>
      </div>

      <PlansPopup open={showPlansPopup} onClose={() => setShowPlansPopup(false)} requiredTier={recipe.tier || 'PREMIUM'} />
    </div>
  );
}
