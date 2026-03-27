import { NextResponse } from 'next/server';

import { persistGeneratedContent } from '@/lib/content-persistence';
import { askOllama, KIMI_PERSONA } from '@/lib/ollama';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { type, prompt } = await req.json();

    if (!type || !prompt) {
      return NextResponse.json({ error: 'Missing type or prompt' }, { status: 400 });
    }

    let systemPrompt = KIMI_PERSONA + '\n\n';

    switch (type) {
      case 'RECIPE':
        systemPrompt += `Genera una RECETA TECNICA en formato JSON puro.
        Propiedades obligatorias:
        - title (string)
        - description (string)
        - category (string: Entrante, Principal, Postre, Cocktail)
        - difficulty (string: Facil, Media, Alta, Maestro)
        - prep_time (string, ej: "45 min")
        - tier (string: "FREE" | "PRO" | "ENTERPRISE")
        - steps (array of strings)
        - ingredients (array of {name: string, amount: string})

        EJEMPLO DE SALIDA:
        { "title": "Nombre", "description": "...", "category": "Principal", "difficulty": "Alta", "prep_time": "60 min", "tier": "PRO", "steps": ["Paso 1"], "ingredients": [{"name": "Ingrediente", "amount": "100g"}] }`;
        break;
      case 'COURSE':
        systemPrompt += `Genera un CURSO ACADEMICO en formato JSON puro.
        Propiedades obligatorias:
        - title (string)
        - description (string)
        - level (string: Principiante, Avanzado, Maestro)
        - tier (string: "FREE" | "PRO" | "PREMIUM")

        EJEMPLO DE SALIDA:
        { "title": "Técnicas de vacío", "description": "...", "level": "Maestro", "tier": "PRO" }`;
        break;
      case 'INGREDIENT':
        systemPrompt += `Genera un INGREDIENTE TECNICO para el LABORATORIO en formato JSON puro.
        Propiedades obligatorias:
        - name (string)
        - scientific_name (string)
        - category (string: ESTABILIZANTE, TEXTURIZANTE, ESPUMANTE, EMULSIFICANTE, SABORIZANTE)
        - culinary_notes (string)
        - origin_region (string)
        - best_season (string o array)
        - technical_data (object: {"Poder Gelificante": "X", "Solubilidad": "Y"})

        EJEMPLO DE SALIDA:
        { "name": "Agar-Agar", "scientific_name": "Gelidium", "category": "ESTABILIZANTE", "culinary_notes": "...", "origin_region": "Japón", "best_season": "Todo el año", "technical_data": {"Poder": "Alto"} }`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const aiResponse = await askOllama([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Genera el contenido basado en este concepto: ${prompt}. RESPONDE SOLO CON EL JSON.` },
    ]);

    const jsonString = aiResponse.replace(/```json|```/g, '').trim();
    const content = JSON.parse(jsonString);

    const insertedId = await persistGeneratedContent({
      type: type === 'RECIPE' ? 'recipe' : type === 'COURSE' ? 'course' : 'ingredient',
      topic: prompt,
      tier: content.tier ?? 'PREMIUM',
      generated: content,
    });

    return NextResponse.json({ success: true, content, id: insertedId });
  } catch (err: any) {
    console.error('[generation-api] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
