import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { requireUser } from '@/lib/server-auth';
import { academySvc } from '@/lib/supabase-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const courseId = params.id;
  const { data: enrollment, error } = await academySvc()
    .from('enrollments')
    .select('payment_required,payment_unlocked')
    .eq('user_id', auth.user.id)
    .eq('course_id', courseId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!enrollment.payment_required || enrollment.payment_unlocked) {
    return NextResponse.json({ error: 'El pago no es necesario para este curso' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: auth.user.id,
    success_url: `${origin}/academy/${courseId}?unlock=success`,
    cancel_url: `${origin}/academy/${courseId}?unlock=cancel`,
    metadata: {
      academy_unlock: 'true',
      course_id: courseId,
      user_id: auth.user.id,
    },
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Desbloqueo de siguiente curso',
            description: 'Permite avanzar al siguiente curso tras agotar tres intentos sin alcanzar el 60%',
          },
          unit_amount: 150,
        },
        quantity: 1,
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
