'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type AccountType = 'PERSONAL' | 'BUSINESS' | 'FREELANCER';

const ACCOUNT_OPTIONS: Array<{ value: AccountType; label: string; description: string }> = [
  { value: 'PERSONAL', label: 'Particular', description: 'Acceso individual estandar.' },
  { value: 'BUSINESS', label: 'Empresa', description: 'Alta societaria con datos fiscales completos.' },
  { value: 'FREELANCER', label: 'Autonomo', description: 'Alta profesional independiente con datos fiscales.' },
];

function RegisterPageContent() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountType, setAccountType] = useState<AccountType>('PERSONAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const type = String(searchParams.get('accountType') || '').toUpperCase();
    if (type === 'BUSINESS' || type === 'FREELANCER' || type === 'PERSONAL') {
      setAccountType(type as AccountType);
    }
  }, [searchParams]);

  const requiresBusinessData = accountType === 'BUSINESS' || accountType === 'FREELANCER';

  const businessMetadata = useMemo(
    () => ({
      account_type: accountType,
      business_name: businessName,
      legal_name: legalName,
      tax_id: taxId,
      billing_email: billingEmail,
      phone,
      country,
      address,
      city,
      postal_code: postalCode,
    }),
    [accountType, address, billingEmail, businessName, city, country, legalName, phone, postalCode, taxId],
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await signUp(email, password, {
        full_name: fullName,
        ...businessMetadata,
      });

      if (result.emailConfirmationRequired) {
        setSuccessMessage(
          `Te hemos enviado un email de verificacion a ${email}. Revisa tu bandeja de entrada para activar la cuenta.`,
        );
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Intentalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121413] p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-full bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-secondary/5 blur-[100px]" />

      <div className="glass-panel relative z-10 w-full max-w-3xl rounded-[48px] border border-outline-variant/10 p-12">
        <div className="mb-12 text-center">
          <AppIcon name="shield_check" size={48} className="mx-auto mb-6 text-secondary" />
          <h1 className="mb-2 text-4xl font-headline font-light text-on-surface">
            Registro de <span className="italic text-secondary">Aspirantes</span>
          </h1>
          <p className="text-sm font-light text-on-surface-variant">
            Unete a la nueva era de la vanguardia culinaria.
          </p>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-error/20 bg-error/10 p-4 text-xs font-light text-error">
            <AppIcon name="help" size={16} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-xs font-light text-secondary">
            <AppIcon name="check_circle" size={16} />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-3">
            <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Tipo de alta</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {ACCOUNT_OPTIONS.map((option) => {
                const active = option.value === accountType;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccountType(option.value)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-secondary/40 bg-secondary/10 text-on-surface'
                        : 'border-outline-variant/10 bg-[#1a1c1b] text-on-surface-variant hover:border-secondary/20'
                    }`}
                  >
                    <p className="font-label text-[10px] uppercase tracking-widest">{option.label}</p>
                    <p className="mt-2 text-xs font-light leading-relaxed">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Nombre completo</label>
            <input
              type="text"
              placeholder="Chef Juan Perez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
              required
            />
          </div>

          {requiresBusinessData && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">
                    {accountType === 'BUSINESS' ? 'Nombre comercial' : 'Nombre profesional'}
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Razon social / nombre fiscal</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">CIF / NIF</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Email de facturacion</label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Telefono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Pais</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Direccion fiscal</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                  required
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Codigo postal</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Email profesional</label>
            <input
              type="email"
              placeholder="tu@negocio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Contrasena</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-secondary py-5 font-label text-[10px] font-bold uppercase tracking-widest text-black shadow-xl shadow-secondary/10 transition-all hover:scale-[1.02] hover:shadow-secondary/20 disabled:opacity-50"
          >
            {loading ? 'Creando identidad...' : 'Finalizar registro'}
          </button>
        </form>

        <div className="mt-8 border-t border-outline-variant/5 pt-8 text-center">
          <p className="text-xs font-light text-on-surface-variant">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="ml-1 text-secondary hover:underline">
              Inicia sesion aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121413]" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
