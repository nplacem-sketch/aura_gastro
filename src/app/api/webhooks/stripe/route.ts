import { NextResponse } from 'next/server';
import { academySvc, identitySvc } from '@/lib/supabase-service';
import Stripe from 'stripe';

// ── Stripe webhook: Financial Bridge ─────────────────────────────────────────
// When a user pays, update their plan in DB1 (Identity) and propagate via
// app_metadata so the Maestro JWT Token carries the permission flag across DBs.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // ── Checkout completed → upgrade user ────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session   = event.data.object as Stripe.Checkout.Session;
      const userId    = session.client_reference_id;
      const customerId = session.customer as string;
      const priceId   = session.metadata?.price_id ?? '';

      if (session.metadata?.academy_unlock === 'true' && session.metadata?.course_id && session.metadata?.user_id) {
        await academySvc()
          .from('enrollments')
          .update({ payment_unlocked: true, payment_required: false, locked_until: null })
          .eq('user_id', session.metadata.user_id)
          .eq('course_id', session.metadata.course_id);

        return NextResponse.json({ received: true });
      }

      const plan = resolvePlan(priceId);

      if (userId) {
        // A: Update profile row
        await identitySvc().from('profiles').update({
          plan, stripe_customer: customerId, subscription_status: 'active'
        }).eq('id', userId);

        // B: Inject into JWT app_metadata — the Maestro Token
        // This propagates to ALL DBs that share the JWT secret
        await identitySvc().auth.admin.updateUserById(userId, {
          app_metadata: { plan, subscription_status: 'active' }
        });

        console.log(`[stripe-webhook] User ${userId} upgraded to ${plan}`);
      }
    }

    // ── Subscription cancelled → downgrade user ──────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const { data: profile } = await identitySvc()
        .from('profiles').select('id').eq('stripe_customer', customerId).single();

      if (profile) {
        await identitySvc().from('profiles').update({
          plan: 'FREE', subscription_status: 'inactive'
        }).eq('id', profile.id);

        await identitySvc().auth.admin.updateUserById(profile.id, {
          app_metadata: { plan: 'FREE', subscription_status: 'inactive' }
        });

        console.log(`[stripe-webhook] User ${profile.id} downgraded to FREE`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe-webhook] Processing error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function resolvePlan(priceId: string): string {
  const PRO_IDS        = (process.env.STRIPE_PRO_PRICE_IDS        ?? '').split(',');
  const PREMIUM_IDS    = (process.env.STRIPE_PREMIUM_PRICE_IDS    ?? '').split(',');
  const ENTERPRISE_IDS = (process.env.STRIPE_ENTERPRISE_PRICE_IDS ?? '').split(',');

  if (ENTERPRISE_IDS.includes(priceId)) return 'ENTERPRISE';
  if (PREMIUM_IDS.includes(priceId))    return 'PREMIUM';
  if (PRO_IDS.includes(priceId))        return 'PRO';
  return 'FREE';
}
