export type MembershipPlan = 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';

export function normalizePlan(value: string | null | undefined): MembershipPlan {
  switch (String(value || '').toUpperCase()) {
    case 'PRO':
      return 'PRO';
    case 'PREMIUM':
      return 'PREMIUM';
    case 'ENTERPRISE':
    case 'EMPRESA':
      return 'ENTERPRISE';
    default:
      return 'FREE';
  }
}

export function normalizeTier(value: string | null | undefined): MembershipPlan {
  return normalizePlan(value);
}

export function canAccessTier(
  plan: string | null | undefined,
  tier: string | null | undefined,
  role?: string | null,
) {
  const normalizedPlan = normalizePlan(plan);
  const normalizedTier = normalizeTier(tier);
  const normalizedRole = String(role || '').toUpperCase();

  if (normalizedRole === 'ADMIN' || normalizedPlan === 'ENTERPRISE') return true;
  if (normalizedTier === 'FREE') return true;
  if (normalizedTier === 'PRO') return normalizedPlan === 'PRO' || normalizedPlan === 'PREMIUM';
  return normalizedPlan === 'PREMIUM';
}
