import { NextResponse } from 'next/server';

import { completeText } from '@/lib/ai-provider';
import { KIMI_PERSONA } from '@/lib/ollama';
import { requireUser } from '@/lib/server-auth';
import { academySvc, labSvc, recipesSvc } from '@/lib/supabase-service';

async function buildGroundedContext(query: string) {
  const [ingredientsRes, techniquesRes, recipesRes, coursesRes] = await Promise.all([
    labSvc().from('ingredients').select('name, category, culinary_notes, technical_data').ilike('name', `%${query.split(' ')[0]}%`).limit(5),
    labSvc().from('techniques').select('name, description, science_basis').ilike('name', `%${query.split(' ')[0]}%`).limit(5),
    recipesSvc().from('recipes').select('title, description, tier, difficulty').ilike('title', `%${query.split(' ')[0]}%`).limit(5),
    academySvc().from('courses').select('title, description, tier, level').ilike('title', `%${query.split(' ')[0]}%`).limit(5),
  ]);

  const sections = [
    ...(ingredientsRes.data ?? []).map((item) => `Ingrediente: ${item.name} | Categoria: ${item.category} | Nota: ${item.culinary_notes} | Datos: ${JSON.stringify(item.technical_data ?? {})}`),
    ...(techniquesRes.data ?? []).map((item) => `Tecnica: ${item.name} | Base cientifica: ${item.science_basis} | Descripcion: ${item.description}`),
    ...(recipesRes.data ?? []).map((item) => `Receta: ${item.title} | Nivel: ${item.tier} | Dificultad: ${item.difficulty} | Descripcion: ${item.description}`),
    ...(coursesRes.data ?? []).map((item) => `Curso: ${item.title} | Nivel: ${item.tier} | Perfil: ${item.level} | Descripcion: ${item.description}`),
  ];

  return sections.join('\n');
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content?.trim();
    if (!lastMessage) {
      return NextResponse.json({ error: 'Pregunta vacia' }, { status: 400 });
    }

    const context = await buildGroundedContext(lastMessage);

    if (!context) {
      return NextResponse.json({
        role: 'ai',
        content: 'No tengo evidencia suficiente en la base verificada para responder con rigor. Añade la fuente al catalogo o formula la consulta con un termino exacto.',
      });
    }

    const systemContent = `${KIMI_PERSONA}

Modo estricto:
- Responde solo con la informacion presente en el contexto.
- Si una afirmacion no aparece sustentada, dilo explicitamente.
- No inventes ingredientes, técnicas, autores, pasos ni equivalencias.
- Cuando detectes un termino dudoso o no verificado, indicalo claramente.

Contexto verificado:
${context}`;

    const completion = await completeText([
      { role: 'system', content: systemContent },
      ...messages,
    ]);

    return NextResponse.json({ role: 'ai', content: completion.content, provider: completion.provider, model: completion.model });
  } catch (err: any) {
    console.error('[chat-bridge] Error:', err.message);
    return NextResponse.json(
      {
        role: 'ai',
        content: 'No he podido responder con base suficiente en este momento. Revisa que el catalogo verificado este sincronizado e intentalo de nuevo.',
      },
      { status: 500 },
    );
  }
}
