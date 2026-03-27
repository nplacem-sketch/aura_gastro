import { NextResponse } from 'next/server';

import { academySvc, identitySvc, marketingSvc, recipesSvc } from '@/lib/supabase-service';
import { requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [
      { count: totalUsers },
      { count: premiumUsers },
      { count: aiRecipes },
      { count: totalCourses },
      { count: pendingPosts },
      { count: marketingPosted },
    ] = await Promise.all([
      identitySvc().from('profiles').select('id', { count: 'estimated', head: true }),
      identitySvc().from('profiles').select('id', { count: 'estimated', head: true }).neq('plan', 'FREE'),
      recipesSvc().from('recipes').select('id', { count: 'estimated', head: true }).eq('is_ai_generated', true),
      academySvc().from('courses').select('id', { count: 'estimated', head: true }),
      marketingSvc().from('marketing_tasks').select('id', { count: 'estimated', head: true }).eq('status', 'ready_to_post'),
      marketingSvc().from('marketing_tasks').select('id', { count: 'estimated', head: true }).eq('status', 'posted'),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers ?? 0,
        premium: premiumUsers ?? 0,
        free: (totalUsers ?? 0) - (premiumUsers ?? 0),
      },
      content: {
        ai_recipes: aiRecipes ?? 0,
        total_courses: totalCourses ?? 0,
      },
      marketing: {
        pending_posts: pendingPosts ?? 0,
        posts_live: marketingPosted ?? 0,
      },
    });
  } catch (err: any) {
    console.error('[admin/stats]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
