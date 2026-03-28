import 'server-only';

import { persistGeneratedContent, type GeneratedContentType } from '@/lib/content-persistence';
import { AURA_EDITOR_PERSONA, askOllama } from '@/lib/ollama';

export type AutoGenerationType = 'RECIPE' | 'COURSE' | 'INGREDIENT';

type GenerateAndPersistParams = {
  type: AutoGenerationType;
  title: string;
  details?: string | null;
  tier?: string | null;
  itemIndex?: number;
  itemCount?: number;
  sourceText?: string | null;
  sourceTitle?: string | null;
};

function normalizeTier(value: string | null | undefined) {
  const tier = String(value || '').trim().toUpperCase();
  if (tier === 'FREE' || tier === 'PRO' || tier === 'PREMIUM') return tier;
  if (tier === 'ENTERPRISE') return 'PREMIUM';
  return 'PREMIUM';
}

function normalizeType(value: string | null | undefined): AutoGenerationType | null {
  const type = String(value || '').trim().toUpperCase();
  if (type === 'RECIPE' || type === 'COURSE' || type === 'INGREDIENT') return type;
  return null;
}

function buildSystemPrompt(type: AutoGenerationType) {
  let systemPrompt = AURA_EDITOR_PERSONA + '\n\n';

  if (type === 'RECIPE') {
    systemPrompt += `Genera una RECETA TECNICA en formato JSON puro.
    Propiedades obligatorias:
    - title (string)
    - description (string)
    - category (string: Entrante, Principal, Postre, Cocktail)
    - difficulty (string: Facil, Media, Alta, Maestro)
    - prep_time (string, ej: "45 min")
    - tier (string: "FREE" | "PRO" | "PREMIUM")
    - tags (array de strings, opcional)
    - steps (array of strings)
    - ingredients (array of {name: string, amount: string})

    EJEMPLO DE SALIDA:
    { "title": "Nombre", "description": "...", "category": "Principal", "difficulty": "Alta", "prep_time": "60 min", "tier": "PRO", "steps": ["Paso 1"], "ingredients": [{"name": "Ingrediente", "amount": "100g"}] }`;
    return systemPrompt;
  }

  if (type === 'COURSE') {
    systemPrompt += `Genera un CURSO ACADEMICO en formato JSON puro.
    Propiedades obligatorias:
    - title (string)
    - description (string)
    - level (string: Principiante, Avanzado, Maestro)
    - duration (string, opcional)
    - tier (string: "FREE" | "PRO" | "PREMIUM")
    - tags (array de strings, opcional)
    - modules (array de objetos con title, content y lessons)
    - lessons (array de objetos con title, content y duration)
    - exam (array de 5 preguntas con question, options y correct_index)

    EJEMPLO DE SALIDA:
    { "title": "Tecnicas de vacio", "description": "...", "level": "Maestro", "tier": "PRO", "modules": [{ "title": "Modulo 1", "content": "...", "lessons": [{ "title": "Leccion 1", "content": "...", "duration": "18 min" }] }], "exam": [{ "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 1 }] }`;
    return systemPrompt;
  }

  systemPrompt += `Genera un INGREDIENTE TECNICO para el LABORATORIO en formato JSON puro.
  Propiedades obligatorias:
  - name (string)
  - scientific_name (string)
  - category (string: ESTABILIZANTE, TEXTURIZANTE, ESPUMANTE, EMULSIFICANTE, SABORIZANTE)
  - culinary_notes (string)
  - origin_region (string)
  - best_season (string o array)
  - technical_data (object: {"Poder Gelificante": "X", "Solubilidad": "Y"})
  - tier (string: "FREE" | "PRO" | "PREMIUM")

  EJEMPLO DE SALIDA:
  { "name": "Agar-Agar", "scientific_name": "Gelidium", "category": "ESTABILIZANTE", "culinary_notes": "...", "origin_region": "Japon", "best_season": "Todo el ano", "technical_data": {"Poder": "Alto"}, "tier": "PRO" }`;
  return systemPrompt;
}

function buildUserPrompt(params: GenerateAndPersistParams) {
  const tier = normalizeTier(params.tier);
  const variantInstruction =
    params.itemCount && params.itemCount > 1
      ? `Genera la pieza ${Number(params.itemIndex || 0) + 1} de ${params.itemCount}. Debe ser claramente distinta, complementaria y no repetir enfoque con las demas piezas del mismo lote.`
      : '';
  const sourceInstruction = params.sourceText
    ? [
        params.sourceTitle ? `El material fuente principal procede del libro "${params.sourceTitle}".` : null,
        'Usa solo la informacion util y sustentada en el material fuente. Si algo no aparece con claridad, no lo inventes.',
        `MATERIAL FUENTE:\n${params.sourceText}`,
      ]
        .filter(Boolean)
        .join(' ')
    : null;

  return [
    `Genera el contenido basado en este concepto: ${params.title}.`,
    params.details ? `Detalle editorial: ${params.details}.` : null,
    `Debe pertenecer al plan ${tier}.`,
    variantInstruction,
    sourceInstruction,
    'RESPONDE SOLO CON EL JSON.',
  ]
    .filter(Boolean)
    .join(' ');
}

function parseGeneratedPayload(response: string) {
  const jsonString = response.replace(/```json|```/g, '').trim();
  return JSON.parse(jsonString) as Record<string, any>;
}

function mapPersistedType(type: AutoGenerationType): GeneratedContentType {
  if (type === 'RECIPE') return 'recipe';
  if (type === 'COURSE') return 'course';
  return 'ingredient';
}

export function isAutoGenerationType(value: string | null | undefined): value is AutoGenerationType {
  return normalizeType(value) !== null;
}

export async function generateAndPersistContent(params: GenerateAndPersistParams) {
  const type = normalizeType(params.type);
  if (!type) {
    throw new Error('Tipo de contenido no soportado para auto-publicacion.');
  }

  const aiResponse = await askOllama([
    { role: 'system', content: buildSystemPrompt(type) },
    { role: 'user', content: buildUserPrompt(params) },
  ], {
    format: 'json',
    temperature: 0.1,
    numCtx: 2048,
  });

  const generated = parseGeneratedPayload(aiResponse);
  const tier = normalizeTier(String(generated.tier || params.tier || 'PREMIUM'));
  const persistedType = mapPersistedType(type);
  const id = await persistGeneratedContent({
    type: persistedType,
    topic: params.title,
    tier,
    generated,
  });

  return {
    id,
    generated,
    tier,
    persistedType,
  };
}
