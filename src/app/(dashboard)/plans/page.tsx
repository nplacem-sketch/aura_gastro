'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import verifiedCatalog from '@/data/verified-catalog.json';
import { normalizePlan } from '@/lib/access';
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

export default function PlansPage() {
  const { user, session, plan, role } = useAuth();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<PlanRecord[]>(verifiedCatalog.plans as PlanRecord[]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/plans', { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data.plans) || data.plans.length === 0) return;

        setPlans(
          data.plans.map((item: any) => {
            const fallback = verifiedCatalog.plans.find((entry) => entry.name === item.name);
            return {
              name: item.name,
              price_monthly_eur: Number(item.price_monthly_eur ?? fallback?.price_monthly_eur ?? 0),
              price_annual_eur: Number(item.price_annual_eur ?? fallback?.price_annual_eur ?? 0),
              description: fallback?.description ?? '',
              features: fallback?.features ?? [],
            };
          }),
        );
      } catch (error) {
        console.error('[Plans] fallback to local catalog', error);
      }
    }

    void fetchPlans();
  }, []);

  const currentPlan = useMemo(() => normalizePlan(plan), [plan]);

  async function handleCheckout(planName: string) {
    if (planName === 'FREE') {
      router.push(user ? '/' : '/register');
      return;
    }

    if (!user || !session?.access_token) {
      router.push('/login');
      return;
    }

    setCheckoutLoading(planName);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/plans/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: planName,
          billingCycle,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'No se pudo iniciar el checkout de Stripe.');
      }

      window.location.href = data.url;
    } catch (error: any) {
      setCheckoutError(error.message || 'No se pudo iniciar el checkout de Stripe.');
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
      <header className="mb-12 text-center sm:mb-16">
        <p className="mb-4 text-center font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
          Inversión en excelencia
        </p>
        <h1 className="mb-8 text-4xl font-headline font-light text-on-surface sm:mb-10 sm:text-6xl lg:text-7xl">
          Niveles de <span className="italic text-secondary">Acceso</span>
        </h1>

        <div className="mb-10 flex items-center justify-center gap-4 sm:mb-12 sm:gap-6">
          <span
            className={`font-label text-xs uppercase tracking-widest transition-all ${
              billingCycle === 'monthly' ? 'font-bold text-secondary' : 'text-on-surface-variant/40'
            }`}
          >
            Mensual
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle((current) => (current === 'monthly' ? 'yearly' : 'monthly'))}
            className="relative h-8 w-16 rounded-full border border-outline-variant/10 bg-surface-container-high p-1 transition-all"
          >
            <div
              className={`absolute top-1 h-6 w-6 rounded-full bg-secondary shadow-lg transition-all ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-3">
            <span
              className={`font-label text-xs uppercase tracking-widest transition-all ${
                billingCycle === 'yearly' ? 'font-bold text-secondary' : 'text-on-surface-variant/40'
              }`}
            >
              Anual
            </span>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-[8px] font-bold uppercase tracking-widest text-primary shadow-lg shadow-primary/10">
              Ahorro anual
            </span>
          </div>
        </div>

        <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed text-on-surface-variant sm:text-base">
          Cada plan ya tiene contenido real asignado por nivel: recetas, ingredientes, técnicas y cursos con módulos,
          lecciones y examen. Los planes PRO mensual y PREMIUM mensual ya muestran descontados los {TRIAL_GIFT_DAYS} días de regalo del primer pago.
        </p>

        {checkoutError && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            {checkoutError}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((planItem) => {
          const monthly = planItem.price_monthly_eur;
          const yearly = planItem.price_annual_eur;
          const effectiveMonthly = billingCycle === 'monthly' ? monthly : Math.round(yearly / 12);
          const discountedMonthly = getDiscountedMonthlyPrice(planItem.name, monthly);
          const savings = getMonthlyGiftSavings(planItem.name, monthly);
          const current = currentPlan === planItem.name || (role === 'ADMIN' && planItem.name === 'ENTERPRISE');
          const popular = planItem.name === 'PRO';

          return (
            <div
              key={planItem.name}
              className={`glass-panel relative flex flex-col rounded-[32px] border p-6 transition-all duration-500 sm:rounded-[40px] sm:p-10 hover:scale-[1.03] ${
                popular ? 'border-primary/40 ring-1 ring-primary/20' : 'border-outline-variant/10'
              }`}
            >
              {popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 font-label text-[9px] uppercase tracking-widest text-black shadow-lg">
                  Más popular
                </span>
              )}

              <div>
                <h3 className="mb-2 font-headline text-2xl tracking-tight text-on-surface sm:text-3xl">{planItem.name}</h3>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-headline font-bold text-on-surface sm:text-5xl">
                    {billingCycle === 'monthly' && hasIntroMonthlyGift(planItem.name)
                      ? formatEuro(discountedMonthly)
                      : formatEuro(effectiveMonthly)}
                  </span>
                  <span className="text-sm font-light text-on-surface-variant">/ mes</span>
                </div>

                {billingCycle === 'monthly' && hasIntroMonthlyGift(planItem.name) && (
                  <div className="mb-4">
                    <p className="animate-fade-in text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Primer mes con {TRIAL_GIFT_DAYS} días descontados
                    </p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      <span className="mr-2 line-through">{formatEuro(monthly)}/mes</span>
                      Ahorro de {formatEuro(savings)} sobre el precio mensual.
                    </p>
                  </div>
                )}

                {billingCycle === 'yearly' && planItem.name !== 'FREE' && (
                  <div className="mb-4">
                    <p className="animate-fade-in text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Pago único de {formatEuro(yearly)} / año
                    </p>
                  </div>
                )}

                <p className="mt-4 min-h-[72px] text-xs font-light leading-relaxed text-on-surface-variant">
                  {normalizeDisplayText(planItem.description)}
                </p>
              </div>

              <div className="mb-10 flex-1 space-y-4">
                {planItem.features.map((feature, index) => (
                  <div key={`${planItem.name}-${index}`} className="flex items-start gap-3">
                    <AppIcon name="check_circle" size={14} className="mt-0.5 text-secondary" />
                    <span className="text-xs font-light text-on-surface-variant">{normalizeDisplayText(feature)}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleCheckout(planItem.name)}
                disabled={current || checkoutLoading === planItem.name}
                className={`w-full rounded-2xl py-4 font-label text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-black/20 transition-all ${
                  current
                    ? 'cursor-default bg-surface-container-highest text-on-surface-variant'
                    : checkoutLoading === planItem.name
                      ? 'cursor-wait bg-secondary/70 text-black'
                      : planItem.name === 'PREMIUM'
                        ? 'bg-secondary text-black hover:bg-secondary/90'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                {current
                  ? 'Plan actual'
                  : checkoutLoading === planItem.name
                    ? 'Redirigiendo a Stripe...'
                    : `Activar ${planItem.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
