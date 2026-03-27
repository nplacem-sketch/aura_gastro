import { NextResponse } from 'next/server';

import { persistGeneratedContent } from '@/lib/content-persistence';
import { requireAdminOrInternal } from '@/lib/server-auth';
import { botFarmSvc } from '@/lib/supabase-service';
import { findVerifiedEntry } from '@/lib/verified-catalog';

type GenerationType = 'recipe' | 'course' | 'ingredient' | 'technique';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrInternal(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { type = 'recipe', topic, tier = 'PREMIUM' } = body as {
      type?: GenerationType;
      topic: string;
      tier?: string;
      queue_id?: string;
    };

    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 });
    }

    const verified = findVerifiedEntry(type, topic);
    if (!verified) {
      return NextResponse.json(
        {
          error: `No existe una entrada verificada para "${topic}". Añadela primero al catalogo validado antes de publicarla.`,
        },
        { status: 422 },
      );
    }

    const insertedId = await persistGeneratedContent({
      type,
      topic,
      tier: String(verified.tier ?? tier),
      generated: verified,
    });

    if (body.queue_id) {
      await botFarmSvc()
        .from('generation_queue')
        .update({
          status: 'completed',
          result_payload: { type, insertedId, source: 'verified_catalog' },
          completed_at: new Date().toISOString(),
        })
        .eq('id', body.queue_id);
    }

    return NextResponse.json({ success: true, type, id: insertedId, generated: verified, source: 'verified_catalog' });
  } catch (err: any) {
    console.error('[generate-content]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
