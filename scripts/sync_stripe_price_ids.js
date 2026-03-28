const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const TRIAL_GIFT_DAYS = 7;
const MONTHLY_REFERENCE_DAYS = 30;

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_IDENTITY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_IDENTITY_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function hasIntroMonthlyGift(planName) {
  return planName === 'PRO' || planName === 'PREMIUM';
}

function expectedUnitAmount(planName, monthlyPriceEur, annualPriceEur, interval) {
  if (interval === 'year') {
    return Math.round(Number(annualPriceEur) * 100);
  }

  const monthlyBase = Number(monthlyPriceEur);
  if (hasIntroMonthlyGift(planName)) {
    return Math.round((monthlyBase * ((MONTHLY_REFERENCE_DAYS - TRIAL_GIFT_DAYS) / MONTHLY_REFERENCE_DAYS)) * 100);
  }

  return Math.round(monthlyBase * 100);
}

function matchesPlanName(price, planName) {
  const productName = String(typeof price.product === 'object' ? price.product.name : price.product || '').toUpperCase();
  return productName.includes(planName);
}

async function run() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  const admin = createAdminClient();

  const { data: plans, error: plansError } = await admin
    .from('plans')
    .select('name,price_monthly_eur,price_annual_eur')
    .in('name', ['PRO', 'PREMIUM', 'ENTERPRISE']);

  if (plansError) throw plansError;

  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

  for (const plan of plans || []) {
    const monthlyAmount = expectedUnitAmount(plan.name, plan.price_monthly_eur, plan.price_annual_eur, 'month');
    const yearlyAmount = expectedUnitAmount(plan.name, plan.price_monthly_eur, plan.price_annual_eur, 'year');

    const monthlyPrice = prices.data.find(
      (price) =>
        price.active &&
        price.currency === 'eur' &&
        price.recurring?.interval === 'month' &&
        price.recurring?.interval_count === 1 &&
        price.unit_amount === monthlyAmount &&
        matchesPlanName(price, plan.name),
    );

    const yearlyPrice = prices.data.find(
      (price) =>
        price.active &&
        price.currency === 'eur' &&
        price.recurring?.interval === 'year' &&
        price.recurring?.interval_count === 1 &&
        price.unit_amount === yearlyAmount &&
        matchesPlanName(price, plan.name),
    );

    if (!monthlyPrice || !yearlyPrice) {
      throw new Error(`Could not resolve Stripe prices for ${plan.name}`);
    }

    const { error: updateError } = await admin
      .from('plans')
      .update({
        stripe_price_monthly: monthlyPrice.id,
        stripe_price_annual: yearlyPrice.id,
      })
      .eq('name', plan.name);

    if (updateError) throw updateError;

    console.log(`${plan.name}: monthly=${monthlyPrice.id} yearly=${yearlyPrice.id}`);
  }

  console.log('Stripe price IDs synchronized.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
