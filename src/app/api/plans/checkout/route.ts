import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { requireUser } from '@/lib/server-auth';
import { normalizeBillingCycle, resolveStripePlanPriceId, isPaidPlan } from '@/lib/stripe-plans';
import { identitySvc } from '@/lib/supabase-service';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any }) : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no esta configurado en el servidor.' }, { status: 500 });
  }

  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || '').toUpperCase();
  const billingCycle = normalizeBillingCycle(body.billingCycle);

  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: 'Plan no valido para checkout.' }, { status: 400 });
  }

  const priceId = resolveStripePlanPriceId(plan, billingCycle);
  if (!priceId) {
    return NextResponse.json(
      { error: `Falta configurar el price ID de Stripe para ${plan} (${billingCycle}).` },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await identitySvc()
    .from('profiles')
    .select('id,email,full_name,plan,subscription_status,stripe_customer')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (String(profile?.plan || auth.profile?.plan || 'FREE').toUpperCase() === plan) {
    const status = String(profile?.subscription_status || '').toLowerCase();
    if (status === 'active' || status === 'trialing') {
      return NextResponse.json({ error: 'Ya tienes este plan activo.' }, { status: 409 });
    }
  }

  const customerId =
    profile?.stripe_customer ||
    (
      await stripe.customers.create({
        email: auth.user.email || profile?.email || undefined,
        name: String(profile?.full_name || auth.user.user_metadata?.full_name || auth.user.email || 'Aura User'),
        metadata: {
          user_id: auth.user.id,
        },
      })
    ).id;

  if (!profile?.stripe_customer) {
    await identitySvc().from('profiles').update({ stripe_customer: customerId }).eq('id', auth.user.id);
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: auth.user.id,
    success_url: `${origin}/plans?checkout=success&plan=${plan}&cycle=${billingCycle}`,
    cancel_url: `${origin}/plans?checkout=cancel&plan=${plan}&cycle=${billingCycle}`,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: auth.user.id,
      plan,
      billing_cycle: billingCycle,
      price_id: priceId,
    },
    subscription_data: {
      metadata: {
        user_id: auth.user.id,
        plan,
        billing_cycle: billingCycle,
        price_id: priceId,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
