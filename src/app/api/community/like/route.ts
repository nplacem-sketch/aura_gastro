import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos Service Key para poder mutar los likes sin importar el RLS público
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL!,
  process.env.SUPABASE_REALTIME_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { post_id } = await req.json();
    
    // As in MVP we don't pass user verification for likes inside the payload (trusting local),
    // ideally we would extract JWT from headers to get user_id.
    // For now we just use a generic RPC or simple update.
    
    // Obtener actual
    const { data: currentPost, error: fErr } = await db.from('posts').select('likes_count').eq('id', post_id).single();
    if (fErr || !currentPost) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    
    // Incrementar
    const { error: updErr } = await db.from('posts').update({
      likes_count: currentPost.likes_count + 1
    }).eq('id', post_id);
    
    if (updErr) throw updErr;

    return NextResponse.json({ success: true, new_likes_count: currentPost.likes_count + 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
