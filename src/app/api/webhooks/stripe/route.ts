import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { resolvePlanFromPriceId } from '@/lib/stripe-plans';
import { academySvc, identitySvc } from '@/lib/supabase-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

async function syncAppMetadata(userId: string, patch: Record<string, unknown>) {
  const existingUser = await identitySvc().auth.admin.getUserById(userId);
  const currentMetadata = existingUser.data.user?.app_metadata || {};

  await identitySvc().auth.admin.updateUserById(userId, {
    app_metadata: {
      ...currentMetadata,
      ...patch,
    },
  });
}

async function syncPlanSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = fallbackUserId || subscription.metadata?.user_id || null;
  const priceId = subscription.items.data[0]?.price?.id || subscription.metadata?.price_id || '';
  const plan = resolvePlanFromPriceId(priceId);

  if (!customerId || !userId || plan === 'FREE') {
    return;
  }

  const subscriptionEndsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await identitySvc()
    .from('profiles')
    .update({
      plan,
      stripe_customer: customerId,
      subscription_status: subscription.status,
      subscription_ends_at: subscriptionEndsAt,
    })
    .eq('id', userId);

  await syncAppMetadata(userId, {
    plan,
    subscription_status: subscription.status,
  });
}

async function downgradeSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  const { data: profile } = await identitySvc()
    .from('profiles')
    .select('id')
    .eq('stripe_customer', customerId)
    .maybeSingle();

  if (!profile?.id) return;

  await identitySvc()
    .from('profiles')
    .update({
      plan: 'FREE',
      subscription_status: 'inactive',
      subscription_ends_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    })
    .eq('id', profile.id);

  await syncAppMetadata(profile.id, {
    plan: 'FREE',
    subscription_status: 'inactive',
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.academy_unlock === 'true' && session.metadata?.course_id && session.metadata?.user_id) {
        await academySvc()
          .from('enrollments')
          .update({ payment_unlocked: true, payment_required: false, locked_until: null })
          .eq('user_id', session.metadata.user_id)
          .eq('course_id', session.metadata.course_id);

        return NextResponse.json({ received: true });
      }

      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        await syncPlanSubscription(subscription, session.client_reference_id);
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      await syncPlanSubscription(event.data.object as Stripe.Subscription);
    }

    if (event.type === 'customer.subscription.deleted') {
      await downgradeSubscription(event.data.object as Stripe.Subscription);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe-webhook] Processing error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
