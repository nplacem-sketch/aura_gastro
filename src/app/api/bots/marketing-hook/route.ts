import { NextResponse } from 'next/server';

// Publication event bridge.
// The webhook is kept intentionally lightweight while the marketing automations
// remain disabled.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = body.record ?? body;

    if (!record?.title) {
      return NextResponse.json({ error: 'No record payload' }, { status: 400 });
    }

    const { title, id } = record;
    const contentType = record.difficulty ? 'RECIPE' : 'COURSE';
    const targetUrl = record.difficulty ? `/recipes/${id}` : `/academy/${id}`;

    console.log(`[marketing-hook] Unit published: "${title}" (${contentType}) -> ${targetUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Publication event logged internally.',
    });
  } catch (err: any) {
    console.error('[marketing-hook]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
