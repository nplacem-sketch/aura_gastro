'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

const registerOptions = [
  {
    type: 'BUSINESS',
    title: 'Empresa',
    description: 'Alta societaria con datos fiscales, facturacion y direccion empresarial obligatorios.',
  },
  {
    type: 'FREELANCER',
    title: 'Autonomo',
    description: 'Registro profesional independiente con datos fiscales y operativos obligatorios.',
  },
];

function LoginPageContent() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verified = searchParams.get('verified') === '1';

  const registerLinks = useMemo(
    () =>
      registerOptions.map((option) => ({
        ...option,
        href: `/register?accountType=${option.type}`,
      })),
    [],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      const message =
        err?.message === 'Email not confirmed'
          ? 'Tu cuenta aun no ha sido verificada. Revisa el email de confirmacion antes de iniciar sesion.'
          : err.message || 'Error al iniciar sesion. Verifica tus credenciales.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121413] p-6">
      <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-full bg-gradient-to-b from-secondary/10 to-transparent" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[48px] border border-outline-variant/10 p-12">
          <div className="mb-12 pt-4 text-center">
            <h1 className="mb-2 text-4xl font-headline font-light text-on-surface">
              Acceso <span className="italic text-secondary">Maestro</span>
            </h1>
            <p className="text-sm font-light text-on-surface-variant">
              Inicia sesion en el ecosistema Aura Gastronomy.
            </p>
          </div>

          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-error/20 bg-error/10 p-4 text-xs font-light text-error">
              <AppIcon name="help" size={16} />
              {error}
            </div>
          )}

          {verified && !error && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-xs font-light text-secondary">
              <AppIcon name="check_circle" size={16} />
              Tu email ha sido verificado. Ya puedes iniciar sesion.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 font-label text-[10px] uppercase tracking-widest text-secondary">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/10 bg-[#1a1c1b] px-6 py-4 pr-14 font-light text-on-surface shadow-xl transition-all focus:border-secondary/30 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-secondary"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}
                >
                  <AppIcon name={showPassword ? 'science' : 'lock'} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-secondary py-5 font-label text-[10px] font-bold uppercase tracking-widest text-black shadow-xl shadow-secondary/10 transition-all hover:scale-[1.02] hover:shadow-secondary/20 disabled:opacity-50"
            >
              {loading ? 'Validando credenciales...' : 'Iniciar sesion'}
            </button>
          </form>

          <div className="mt-8 border-t border-outline-variant/5 pt-8 text-center">
            <p className="text-xs font-light text-on-surface-variant">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="ml-1 text-secondary hover:underline">
                Registrate gratis
              </Link>
            </p>
          </div>
        </div>

        <aside className="glass-panel rounded-[40px] border border-outline-variant/10 p-10">
          <p className="mb-4 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
            Alta profesional
          </p>
          <h2 className="mb-4 text-3xl font-headline font-light text-on-surface">
            Registro para <span className="italic text-secondary">empresa o autonomo</span>
          </h2>
          <p className="mb-8 text-sm font-light leading-relaxed text-on-surface-variant">
            Si el usuario es profesional, el alta pedira todos los datos empresariales antes de crear la cuenta.
          </p>

          <div className="space-y-4">
            {registerLinks.map((option) => (
              <Link
                key={option.type}
                href={option.href}
                className="block rounded-[28px] border border-outline-variant/10 bg-[#1a1c1b] p-6 transition-all hover:border-secondary/30 hover:bg-[#202221]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-headline text-on-surface">{option.title}</p>
                    <p className="mt-3 text-sm font-light leading-relaxed text-on-surface-variant">
                      {option.description}
                    </p>
                  </div>
                  <AppIcon name="arrow_forward" size={18} className="mt-1 text-secondary" />
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121413]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
