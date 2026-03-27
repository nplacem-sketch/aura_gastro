'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AppIcon from '@/components/AppIcon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, { full_name: fullName });
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121413] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-xl glass-panel p-12 rounded-[48px] border border-outline-variant/10 relative z-10 animate-scale-in">
        <div className="text-center mb-12">
          <AppIcon name="shield_check" size={48} className="text-secondary mx-auto mb-6" />
          <h1 className="text-4xl font-headline font-light text-on-surface mb-2">Registro de <span className="italic text-secondary">Aspirantes</span></h1>
          <p className="text-on-surface-variant font-light text-sm">Únete a la nueva era de la vanguardia culinaria.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-light animate-shake flex items-center gap-3">
            <AppIcon name="help" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Nombre Completo</label>
            <input 
              type="text" 
              placeholder="Chef Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-2xl py-4 px-6 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Email Profesional</label>
            <input 
              type="email" 
              placeholder="tu@negocio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-2xl py-4 px-6 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-2xl py-4 px-6 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-black py-5 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold shadow-xl shadow-secondary/10 hover:shadow-secondary/20 transition-all scale-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Creando Identidad...' : 'Finalizar Registro'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-outline-variant/5 text-center">
          <p className="text-on-surface-variant text-xs font-light">
            ¿Ya tienes cuenta? <Link href="/login" className="text-secondary hover:underline ml-1">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
