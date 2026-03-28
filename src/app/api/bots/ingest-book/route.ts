import { NextResponse } from 'next/server';

import { generateAndPersistContent, isAutoGenerationType } from '@/lib/content-generation';
import { requireAdminOrInternal } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrInternal(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      type,
      tier = 'PREMIUM',
      topic,
      details,
      sourceText,
      sourceTitle,
      sourceFile,
      sourcePages,
      sourceMode,
    } = body as {
      type?: string;
      tier?: string;
      topic?: string;
      details?: string;
      sourceText?: string;
      sourceTitle?: string;
      sourceFile?: string;
      sourcePages?: number[];
      sourceMode?: string;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 });
    }

    if (!isAutoGenerationType(type)) {
      return NextResponse.json({ error: 'type must be COURSE, RECIPE or INGREDIENT' }, { status: 400 });
    }

    if (!sourceText?.trim()) {
      return NextResponse.json({ error: 'sourceText required' }, { status: 400 });
    }

    const sourceHeader = [
      sourceTitle ? `Fuente: ${sourceTitle}.` : null,
      sourceFile ? `Archivo: ${sourceFile}.` : null,
      Array.isArray(sourcePages) && sourcePages.length > 0 ? `Paginas muestreadas: ${sourcePages.join(', ')}.` : null,
      sourceMode ? `Modo de lectura: ${sourceMode}.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const result = await generateAndPersistContent({
      type,
      title: topic,
      tier,
      details: [details, sourceHeader].filter(Boolean).join('\n\n'),
      sourceText,
      sourceTitle: sourceTitle || null,
    });

    return NextResponse.json({ success: true, id: result.id, generated: result.generated });
  } catch (err: any) {
    console.error('[ingest-book]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
