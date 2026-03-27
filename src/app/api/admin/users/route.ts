import { NextResponse } from 'next/server';

import { identityServiceDb } from '@/lib/supabase';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await identityServiceDb()
      .from('profiles')
      .select('id, full_name, email, role, plan, status, subscription_status, subscription_ends_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { userId, action, value, email, password, fullName, role, plan } = body;

    if (action === 'CREATE_USER') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
      }

      const normalizedRole = String(role || 'USER').toUpperCase();
      const normalizedPlan = String(plan || 'FREE').toUpperCase();
      const normalizedName = String(fullName || '').trim() || String(email).split('@')[0];

      const { data: created, error: createError } = await identityServiceDb().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: normalizedName },
        app_metadata: {
          role: normalizedRole,
          plan: normalizedPlan,
          subscription_status: normalizedPlan === 'FREE' ? 'inactive' : 'active',
        },
      });

      if (createError) throw createError;

      const profilePayload = {
        id: created.user.id,
        email,
        full_name: normalizedName,
        role: normalizedRole,
        plan: normalizedPlan,
        status: 'ACTIVE',
        subscription_status: normalizedPlan === 'FREE' ? 'inactive' : 'active',
      };

      const { error: profileError } = await identityServiceDb().from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (profileError) throw profileError;

      return NextResponse.json({ success: true, user: profilePayload });
    }

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    const { data: current, error: currentError } = await identityServiceDb()
      .from('profiles')
      .select('subscription_ends_at, plan, status, subscription_status')
      .eq('id', userId)
      .single();

    if (currentError) throw currentError;

    const update: Record<string, unknown> = {};

    switch (action) {
      case 'BLOCK':
        update.status = 'BLOCKED';
        update.subscription_status = 'inactive';
        break;
      case 'UNBLOCK':
        update.status = 'ACTIVE';
        update.subscription_status = current?.plan === 'FREE' ? 'inactive' : 'active';
        break;
      case 'SET_PLAN':
        update.plan = value;
        update.subscription_status = value === 'FREE' ? 'inactive' : 'active';
        break;
      case 'GIFT_TIME': {
        const now = current?.subscription_ends_at ? new Date(current.subscription_ends_at) : new Date();
        const future = new Date(now.getTime() + Number(value || 0) * 24 * 60 * 60 * 1000);
        update.subscription_ends_at = future.toISOString();
        break;
      }
      case 'EXPEL':
        update.status = 'EXPELLED';
        update.plan = 'FREE';
        update.subscription_status = 'inactive';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { error } = await identityServiceDb().from('profiles').update(update).eq('id', userId);
    if (error) throw error;

    const nextPlan = String(update.plan ?? current?.plan ?? 'FREE');
    const nextStatus = String(update.status ?? current?.status ?? 'ACTIVE');
    const nextSubscriptionStatus = String(
      update.subscription_status ?? current?.subscription_status ?? (nextPlan === 'FREE' ? 'inactive' : 'active'),
    );

    await identityServiceDb().auth.admin.updateUserById(userId, {
      app_metadata: {
        plan: nextPlan,
        status: nextStatus,
        subscription_status: nextSubscriptionStatus,
      },
    });

    return NextResponse.json({ success: true, updated: update });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
