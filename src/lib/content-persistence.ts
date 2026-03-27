import 'server-only';

import { academySvc, labSvc, marketingSvc, recipesSvc } from '@/lib/supabase-service';

export type GeneratedContentType = 'recipe' | 'course' | 'ingredient' | 'technique';

type PersistParams = {
  type: GeneratedContentType;
  topic: string;
  tier: string;
  generated: Record<string, any>;
};

function normalizeTextArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return fallback;
}

function parseIngredientAmount(amount: unknown) {
  const raw = typeof amount === 'string' ? amount.trim() : '';
  if (!raw) {
    return { quantity: null as string | null, unit: null as string | null };
  }

  const match = raw.match(/^([\d.,/-]+)\s*(.*)$/);
  if (!match) {
    return { quantity: raw, unit: null };
  }

  return {
    quantity: match[1] || raw,
    unit: match[2] || null,
  };
}

async function persistRecipe(topic: string, tier: string, generated: Record<string, any>) {
  const { data, error } = await recipesSvc()
    .from('recipes')
    .insert({
      title: generated.title ?? topic,
      description: generated.description ?? '',
      category: generated.category ?? null,
      difficulty: generated.difficulty ?? 'Avanzado',
      prep_time: generated.prep_time ?? null,
      cover_image: generated.cover_image ?? null,
      is_premium: tier !== 'FREE',
      is_ai_generated: false,
      tier,
      tags: normalizeTextArray(generated.tags),
    })
    .select('id')
    .single();

  if (error) throw error;

  if (Array.isArray(generated.steps) && generated.steps.length > 0) {
    const { error: stepsError } = await recipesSvc().from('recipe_steps').insert(
      generated.steps.map((step: unknown, index: number) => ({
        recipe_id: data.id,
        step_number: index + 1,
        instruction: typeof step === 'string' ? step : String((step as { instruction?: string })?.instruction ?? ''),
      })),
    );

    if (stepsError) throw stepsError;
  }

  if (Array.isArray(generated.ingredients) && generated.ingredients.length > 0) {
    const { error: ingredientsError } = await recipesSvc().from('recipe_ingredients').insert(
      generated.ingredients.map((ingredient: any) => {
        const amount = parseIngredientAmount(ingredient?.amount);
        return {
          recipe_id: data.id,
          name: ingredient?.name ?? 'Ingrediente',
          quantity: amount.quantity,
          unit: amount.unit,
        };
      }),
    );

    if (ingredientsError) throw ingredientsError;
  }

  const { error: marketingError } = await marketingSvc().from('marketing_tasks').insert({
    campaign_type: 'NEW_RECIPE',
    target_url: `/recipes/${data.id}`,
    context: `${generated.title ?? topic}: ${generated.description ?? ''}`,
    platform: 'X',
    status: 'pending_generation',
  });

  if (marketingError) throw marketingError;

  return data.id as string;
}

async function persistCourse(topic: string, tier: string, generated: Record<string, any>) {
  const { data, error } = await academySvc()
    .from('courses')
    .insert({
      title: generated.title ?? topic,
      description: generated.description ?? '',
      image_url: generated.image_url ?? null,
      level: generated.level ?? 'Chef',
      duration: generated.duration ?? null,
      tier,
      is_premium: tier !== 'FREE',
      is_ai_generated: false,
      status: 'published',
      author: generated.author ?? 'Equipo AURA GASTRONOMY',
      tags: normalizeTextArray(generated.tags),
    })
    .select('id')
    .single();

  if (error) throw error;

  if (Array.isArray(generated.modules) && generated.modules.length > 0) {
    const { data: moduleRows, error: modulesError } = await academySvc()
      .from('modules')
      .insert(
        generated.modules.map((module: any, index: number) => ({
          course_id: data.id,
          title: module?.name ?? module?.title ?? `Módulo ${index + 1}`,
          content: module?.content ?? '',
          order_index: index,
        })),
      )
      .select('id');

    if (modulesError) throw modulesError;

    const lessonsPayload =
      moduleRows?.flatMap((moduleRow: { id: string }, moduleIndex: number) => {
        const sourceModule = generated.modules[moduleIndex];
        const lessons = Array.isArray(sourceModule?.lessons) ? sourceModule.lessons : [];

        return lessons.map((lesson: any, lessonIndex: number) => ({
          module_id: moduleRow.id,
          title: lesson?.title ?? `Lección ${lessonIndex + 1}`,
          content: lesson?.content ?? '',
          video_url: lesson?.video_url ?? null,
          duration: lesson?.duration ?? null,
          order_index: lessonIndex,
        }));
      }) ?? [];

    if (lessonsPayload.length > 0) {
      const { error: lessonsError } = await academySvc().from('lessons').insert(lessonsPayload);
      if (lessonsError) throw lessonsError;
    }
  }

  if (Array.isArray(generated.exam) && generated.exam.length > 0) {
    const { error: examError } = await academySvc().from('exams').insert({
      course_id: data.id,
      questions: generated.exam,
    });

    if (examError) throw examError;
  }

  const { error: marketingError } = await marketingSvc().from('marketing_tasks').insert({
    campaign_type: 'NEW_COURSE',
    target_url: `/academy/${data.id}`,
    context: `${generated.title ?? topic}: ${generated.description ?? ''}`,
    platform: 'X',
    status: 'pending_generation',
  });

  if (marketingError) throw marketingError;

  return data.id as string;
}

async function persistIngredient(topic: string, tier: string, generated: Record<string, any>) {
  const bestSeason = normalizeTextArray(generated.best_season, ['Todo el año']);

  const { data, error } = await labSvc()
    .from('ingredients')
    .upsert(
      {
        name: generated.name ?? topic,
        scientific_name: generated.scientific_name ?? null,
        category: generated.category ?? 'TEXTURIZANTE',
        origin_region: generated.origin_region ?? null,
        best_season: bestSeason,
        technical_data: generated.technical_data ?? {},
        culinary_notes: generated.culinary_notes ?? generated.description ?? '',
        image_url: generated.image_url ?? null,
        is_premium: tier !== 'FREE',
        tier,
      },
      { onConflict: 'name' },
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function persistTechnique(topic: string, tier: string, generated: Record<string, any>) {
  const { data, error } = await labSvc()
    .from('techniques')
    .insert({
      name: generated.name ?? topic,
      description: generated.description ?? '',
      difficulty: generated.difficulty ?? 'Avanzado',
      science_basis: generated.science_basis ?? '',
      equipment_needed: generated.equipment_needed ?? '',
      temperature_control: generated.temperature_control ?? '',
      is_premium: tier !== 'FREE',
      tier,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function persistGeneratedContent(params: PersistParams) {
  const { type, topic, tier, generated } = params;

  if (type === 'recipe') return persistRecipe(topic, tier, generated);
  if (type === 'course') return persistCourse(topic, tier, generated);
  if (type === 'ingredient') return persistIngredient(topic, tier, generated);
  return persistTechnique(topic, tier, generated);
}
