'use client';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

export default function BotFarmPage() {
  const { isAdmin, loading: authLoading, session } = useAuth();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (authLoading) {
    return <div className="p-20 text-center font-label text-xs uppercase tracking-widest text-secondary animate-pulse">Sincronizando permisos...</div>;
  }

  if (!isAdmin) {
    return <div className="p-20 text-center font-headline text-2xl text-secondary animate-pulse">Acceso denegado. Solo administración Aura.</div>;
  }

  async function triggerGeneration(type: 'recipe' | 'course') {
    const topic = (document.getElementById('gen-topic') as HTMLInputElement | null)?.value?.trim();
    const tier = (document.getElementById('gen-tier') as HTMLSelectElement | null)?.value || 'PREMIUM';

    if (!topic || !session?.access_token) return;

    const res = await fetch('/api/bots/generate-content', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, topic, tier }),
    });

    if (res.ok) {
      alert(`${type === 'recipe' ? 'Receta' : 'Curso'} generado con exito (${tier})`);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo generar el contenido.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 relative animate-fade-in">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6 overflow-hidden">
        <div className="animate-slide-up">
          <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-2">Arquitectura de Operaciones</p>
          <h1 className="text-5xl font-headline font-light text-on-surface">
            Centro de <span className="italic text-secondary">Control</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel px-6 py-4 rounded-xl border border-outline-variant/10 text-[9px] font-label uppercase tracking-widest text-[#afcdc3]/40">
            Ejes de Conocimiento: ACTIVOS
          </div>
          <div className="glass-panel px-6 py-4 rounded-xl border border-outline-variant/10 text-[9px] font-label uppercase tracking-widest text-[#afcdc3]/40">
            Cuentas: SINCRONIZADAS
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {[
          { label: 'Estructuración', value: 'Completa', icon: 'data_object' },
          { label: 'Consultas Hub', value: '1.2k', icon: 'forum' },
          { label: 'Tiempo Respuesta', value: '142ms', icon: 'bolt' },
          { label: 'Sincronia Maestro', value: 'OPTIMA', icon: 'shield_check' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl border border-outline-variant/5 hover:border-secondary/20 transition-all transition-duration-500">
            <div className="flex items-center gap-4 mb-4">
              <AppIcon name={stat.icon as any} className="text-secondary" size={18} />
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{stat.label}</p>
            </div>
            <p className="text-3xl font-headline text-on-surface">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <section className="lg:col-span-2 glass-panel p-10 rounded-3xl border border-outline-variant/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full -mr-64 -mt-64 blur-[120px] pointer-events-none group-hover:bg-secondary/10 transition-all" />
          <div className="relative z-10">
            <h3 className="font-headline text-3xl text-on-surface mb-2">Generador de Contenido</h3>
            <p className="font-label text-[10px] uppercase tracking-widest text-[#afcdc3]/40 mb-10">Servicio de Redaccion: Kimi (Ollama)</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block font-label text-[10px] uppercase tracking-widest text-[#afcdc3]/40">Configuración de generación</label>
                  <select
                    id="gen-tier"
                    defaultValue="PREMIUM"
                    className="bg-surface-container-high border border-outline-variant/10 px-4 py-2 rounded-xl text-[10px] font-label uppercase tracking-widest text-secondary focus:outline-none"
                  >
                    <option value="FREE">Plan FREE (Basico)</option>
                    <option value="PRO">Plan PRO (Medio)</option>
                    <option value="PREMIUM">Plan PREMIUM (Elite)</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <input
                    id="gen-topic"
                    placeholder="Ej: Tecnicas de esferificacion avanzada..."
                    className="flex-1 bg-surface-container-high border border-outline-variant/10 p-5 rounded-2xl text-on-surface focus:outline-none focus:border-secondary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => void triggerGeneration('recipe')}
                  className="group flex flex-col items-center justify-center gap-4 py-8 bg-surface-container-high rounded-3xl border border-outline-variant/10 hover:border-secondary/40 transition-all"
                >
                  <AppIcon name="menu_book" size={36} className="text-secondary" aria-label="Receta" />
                  <span className="font-label text-[10px] uppercase tracking-widest font-bold">Generar Receta</span>
                </button>
                <button
                  onClick={() => void triggerGeneration('course')}
                  className="group flex flex-col items-center justify-center gap-4 py-8 bg-primary/10 rounded-3xl border border-primary/20 hover:border-primary/50 transition-all"
                >
                  <AppIcon name="school" size={36} className="text-primary" aria-label="Curso" />
                  <span className="font-label text-[10px] uppercase tracking-widest font-bold text-primary">Generar Curso Academico</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel p-10 rounded-3xl border border-outline-variant/10 flex flex-col justify-center text-center">
          <AppIcon name="integration_instructions" size={44} className="text-[#afcdc3]/20 mb-6 mx-auto" aria-label="Integraciones" />
          <h4 className="font-headline text-2xl text-on-surface mb-2">Protocolos Sociales</h4>
          <p className="text-xs font-light text-on-surface-variant leading-relaxed mb-8">
            La automatizacion externa se encuentra en pausa por mantenimiento de API. El nucleo interno Kimi permanece operativo.
          </p>
          <div className="flex items-center justify-center gap-3 py-4 bg-outline-variant/5 rounded-2xl border border-outline-variant/10 grayscale">
            <span className="w-1.5 h-1.5 rounded-full bg-[#afcdc3]/20" />
            <span className="font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Nodos Externos: Offline</span>
          </div>
        </section>
      </div>
    </div>
  );
}
