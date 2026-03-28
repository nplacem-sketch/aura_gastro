'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import AppIcon from '@/components/AppIcon';
import verifiedCatalog from '@/data/verified-catalog.json';
import { canAccessTier, normalizePlan } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';
import {
  formatEuro,
  getDiscountedMonthlyPrice,
  getMonthlyGiftSavings,
  hasIntroMonthlyGift,
  TRIAL_GIFT_DAYS,
} from '@/lib/pricing';
import { normalizeDisplayText } from '@/lib/text';

type PlanRecord = {
  name: string;
  price_monthly_eur: number;
  price_annual_eur: number;
  description: string;
  features: string[];
};

export default function PlansPopup({
  open,
  onClose,
  requiredTier = 'PRO',
}: {
  open: boolean;
  onClose: () => void;
  requiredTier?: string;
}) {
  const { user, plan, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  const normalizedRequiredTier = normalizePlan(requiredTier);
  const normalizedCurrentPlan = normalizePlan(plan);
  const plans = (verifiedCatalog.plans as PlanRecord[]).filter((item) => item.name !== 'ENTERPRISE');

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-3 backdrop-blur-xl sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-outline-variant/10 bg-[#121413] p-5 shadow-2xl shadow-black/50 sm:rounded-[36px] sm:p-8 md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-outline-variant/10 p-2 text-on-surface-variant transition-all hover:border-secondary/30 hover:text-secondary"
          aria-label="Cerrar popup de planes"
        >
          <AppIcon name="close" size={16} />
        </button>

        <div className="mb-6 max-w-2xl sm:mb-8">
          <p className="mb-3 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
            Acceso restringido
          </p>
          <h2 className="text-3xl font-headline text-on-surface sm:text-4xl">
            Esta zona requiere <span className="italic text-secondary">plan {normalizedRequiredTier}</span>
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-on-surface-variant">
            Si quieres entrar en las areas PRO o PREMIUM, elige uno de los planes disponibles. En PRO mensual y PREMIUM mensual ya veras descontados los {TRIAL_GIFT_DAYS} dias de regalo del primer pago.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {plans.map((planItem) => {
            const monthlyPrice = Number(planItem.price_monthly_eur || 0);
            const discountedPrice = getDiscountedMonthlyPrice(planItem.name, monthlyPrice);
            const savings = getMonthlyGiftSavings(planItem.name, monthlyPrice);
            const current =
              normalizedCurrentPlan === planItem.name || (role === 'ADMIN' && planItem.name === 'PREMIUM');
            const recommended =
              planItem.name === normalizedRequiredTier ||
              (normalizedRequiredTier === 'PREMIUM' && planItem.name === 'PREMIUM');
            const canEnter = canAccessTier(plan, planItem.name, role);
            const freeBlocked = monthlyPrice === 0 && normalizedRequiredTier !== 'FREE';
            const actionHref = current ? '/' : monthlyPrice === 0 ? (user ? '/' : '/register') : '/plans';

            return (
              <div
                key={planItem.name}
                className={`rounded-[24px] border p-5 transition-all sm:rounded-[28px] sm:p-6 ${
                  recommended ? 'border-secondary/40 bg-secondary/8' : 'border-outline-variant/10 bg-surface-container-high/10'
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.35em] text-secondary">
                      {planItem.name}
                    </p>
                    <h3 className="mt-3 text-2xl font-headline text-on-surface sm:text-3xl">{planItem.name}</h3>
                  </div>
                  {recommended && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-black">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  {monthlyPrice === 0 ? (
                    <div className="text-3xl font-headline text-on-surface sm:text-4xl">Gratis</div>
                  ) : hasIntroMonthlyGift(planItem.name) ? (
                    <>
                      <div className="flex items-end gap-3">
                        <span className="text-3xl font-headline text-on-surface sm:text-4xl">{formatEuro(discountedPrice)}</span>
                        <span className="pb-1 text-sm text-on-surface-variant">primer mes</span>
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        <span className="mr-2 line-through opacity-70">{formatEuro(monthlyPrice)}/mes</span>
                        Ahorras {formatEuro(savings)} con {TRIAL_GIFT_DAYS} dias de regalo.
                      </p>
                    </>
                  ) : (
                    <div className="text-3xl font-headline text-on-surface sm:text-4xl">{formatEuro(monthlyPrice)}/mes</div>
                  )}
                </div>

                <p className="mb-5 min-h-[72px] text-sm font-light leading-relaxed text-on-surface-variant">
                  {normalizeDisplayText(planItem.description)}
                </p>

                <div className="mb-6 space-y-3">
                  {planItem.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-xs text-on-surface-variant">
                      <AppIcon name="check_circle" size={14} className="mt-0.5 text-secondary" />
                      <span>{normalizeDisplayText(feature)}</span>
                    </div>
                  ))}
                </div>

                {freeBlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.back();
                    }}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-surface-container-high px-5 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-highest"
                  >
                    Volver
                  </button>
                ) : (
                  <Link
                    href={actionHref}
                    onClick={onClose}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 font-label text-[10px] uppercase tracking-widest transition-all ${
                      current
                        ? 'bg-surface-container-highest text-on-surface-variant'
                        : recommended || !canEnter
                          ? 'bg-secondary text-black hover:opacity-90'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    {current ? 'Tu plan actual' : monthlyPrice === 0 ? (user ? 'Ir al inicio' : 'Empezar gratis') : 'Ver planes'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
