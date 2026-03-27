import { NextResponse } from 'next/server';

// ── Marketing Viral Bridge ────────────────────────────────────────────────────
// This endpoint is called by the Supabase Webhook on recipes/courses INSERT.
// It generates viral content for X/Twitter, Instagram, and TikTok using AI,
// then stores the ready-to-post tasks in the marketing DB.

export async function POST(req: Request) {
  try {
    // Supabase DB webhook sends `record` (the new row)
    const body = await req.json();
    const record = body.record ?? body;

    if (!record?.title) {
      return NextResponse.json({ error: 'No record payload' }, { status: 400 });
    }

    const { title, description, id, cover_image } = record;
    const targetUrl = record.difficulty ? `/recipes/${id}` : `/academy/${id}`;
    const contentType = record.difficulty ? 'RECIPE' : 'COURSE';

    // ── Generate visual-first copy via AI ───────────────────────────────────
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct',
        messages: [{
          role: 'user',
          content: `You are a viral chef CMO. 
A new gastro unit was published: ${title} (${description ?? ''}).
Focus on INSTAGRAM and TIKTOK. 
Return STRICT JSON:
{
  "instagram_reel": {
    "caption": "Luxury culinary caption with trending hashtags",
    "visual_flow": "Step by step visual storyboard for the reel",
    "audio_vibe": "Audio style (e.g. ASMR, Lofi, Orchestral)"
  },
  "tiktok_viral": {
    "hook": "First 3 seconds scroll-stopper",
    "script": "Fast paced 60s script with technical cuts",
    "cta": "TikTok specific call to action"
  }
}`,
        }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

    const aiData   = await aiRes.json();
    const content  = JSON.parse(aiData.choices?.[0]?.message?.content ?? '{}');

    // ── Internal tracking of publication event ──────────────────────────────
    console.log(`[marketing-hook] Unit published: "${title}" (${contentType})`);
    
    // Automation tasks are currently disabled per request.
    // Future: Re-enable IG/TikTok bots here.
    
    return NextResponse.json({ success: true, message: 'Publication event logged internally.' });
  } catch (err: any) {
    console.error('[marketing-hook]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
