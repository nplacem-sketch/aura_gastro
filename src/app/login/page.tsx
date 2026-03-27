'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AppIcon from '@/components/AppIcon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121413] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg glass-panel p-12 rounded-[48px] border border-outline-variant/10 relative z-10 animate-scale-in">
        <div className="text-center mb-12 pt-4">
          <h1 className="text-4xl font-headline font-light text-on-surface mb-2">Acceso <span className="italic text-secondary">Maestro</span></h1>
          <p className="text-on-surface-variant font-light text-sm">Inicia sesión en el ecosistema Aura Gastronomy.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-light animate-shake flex items-center gap-3">
            <AppIcon name="help" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Email</label>
            <input 
              type="email" 
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-2xl py-4 px-6 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-2xl py-4 px-6 pr-14 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <AppIcon name={showPassword ? "science" : "lock"} size={18} />
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-black py-5 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold shadow-xl shadow-secondary/10 hover:shadow-secondary/20 transition-all scale-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Validando Credenciales...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-outline-variant/5 text-center">
          <p className="text-on-surface-variant text-xs font-light">
            ¿No tienes cuenta? <Link href="/register" className="text-secondary hover:underline ml-1">Regístrate gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
