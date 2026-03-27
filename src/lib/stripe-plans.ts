export type BillingCycle = 'monthly' | 'yearly';
export type PaidPlan = 'PRO' | 'PREMIUM' | 'ENTERPRISE';

const PAID_PLANS: PaidPlan[] = ['PRO', 'PREMIUM', 'ENTERPRISE'];

function getPlanPriceEnv(plan: PaidPlan): string {
  switch (plan) {
    case 'PRO':
      return process.env.STRIPE_PRO_PRICE_IDS ?? '';
    case 'PREMIUM':
      return process.env.STRIPE_PREMIUM_PRICE_IDS ?? '';
    case 'ENTERPRISE':
      return process.env.STRIPE_ENTERPRISE_PRICE_IDS ?? '';
  }
}

function parsePriceIds(raw: string) {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isPaidPlan(value: string): value is PaidPlan {
  return PAID_PLANS.includes(String(value).toUpperCase() as PaidPlan);
}

export function normalizeBillingCycle(value: unknown): BillingCycle {
  return String(value).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
}

export function resolveStripePlanPriceId(plan: PaidPlan, billingCycle: BillingCycle) {
  const priceIds = parsePriceIds(getPlanPriceEnv(plan));
  if (priceIds.length === 0) return null;

  if (billingCycle === 'yearly') {
    return priceIds[1] ?? priceIds[0] ?? null;
  }

  return priceIds[0] ?? null;
}

export function resolvePlanFromPriceId(priceId: string): PaidPlan | 'FREE' {
  const normalizedPriceId = String(priceId || '').trim();
  if (!normalizedPriceId) return 'FREE';

  for (const plan of PAID_PLANS) {
    const priceIds = parsePriceIds(getPlanPriceEnv(plan));
    if (priceIds.includes(normalizedPriceId)) {
      return plan;
    }
  }

  return 'FREE';
}
