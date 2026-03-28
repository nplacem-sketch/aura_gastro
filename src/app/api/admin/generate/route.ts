import { NextResponse } from 'next/server';

import { generateAndPersistContent, isAutoGenerationType } from '@/lib/content-generation';
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

    if (!isAutoGenerationType(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const result = await generateAndPersistContent({
      type,
      title: String(prompt).trim(),
    });

    return NextResponse.json({
      success: true,
      content: result.generated,
      id: result.id,
      tier: result.tier,
    });
  } catch (err: any) {
    console.error('[generation-api] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
