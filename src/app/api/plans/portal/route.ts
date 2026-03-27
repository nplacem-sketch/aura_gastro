import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { requireUser } from '@/lib/server-auth';
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

  const { data: profile, error: profileError } = await identitySvc()
    .from('profiles')
    .select('stripe_customer,plan')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const customerId = profile?.stripe_customer || null;
  if (!customerId) {
    return NextResponse.json({ error: 'No hay una suscripcion de Stripe asociada a esta cuenta.' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/profile`,
  });

  return NextResponse.json({ url: session.url });
}
