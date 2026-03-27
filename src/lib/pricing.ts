export const TRIAL_GIFT_DAYS = 7;
const MONTHLY_REFERENCE_DAYS = 30;

export function hasIntroMonthlyGift(planName: string) {
  const normalized = String(planName || '').toUpperCase();
  return normalized === 'PRO' || normalized === 'PREMIUM';
}

export function getDiscountedMonthlyPrice(planName: string, monthlyPrice: number) {
  if (!hasIntroMonthlyGift(planName)) return monthlyPrice;
  return Math.round((monthlyPrice * ((MONTHLY_REFERENCE_DAYS - TRIAL_GIFT_DAYS) / MONTHLY_REFERENCE_DAYS)) * 100) / 100;
}

export function getMonthlyGiftSavings(planName: string, monthlyPrice: number) {
  if (!hasIntroMonthlyGift(planName)) return 0;
  return Math.round((monthlyPrice - getDiscountedMonthlyPrice(planName, monthlyPrice)) * 100) / 100;
}

export function formatEuro(value: number) {
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}
