'use client';

import { useCallback, useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  subscription_ends_at: string;
  created_at: string;
};

export default function AdminDashboard() {
  const { isAdmin, session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'USERS' | 'CONTENT'>('USERS');
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
    plan: 'FREE',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [genType, setGenType] = useState<'RECIPE' | 'COURSE' | 'INGREDIENT'>('RECIPE');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !session?.access_token) return;
    setLoading(true);
    const res = await fetch('/api/admin/users', {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const data = await res.json();
    if (!data.error) setUsers(data);
    setLoading(false);
  }, [isAdmin, session?.access_token]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleAction(userId: string, action: string, value?: any) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userId, action, value }),
    });
    const result = await res.json();
    if (result.success) await fetchUsers();
  }

  async function handleCreateUser() {
    if (!createForm.email || !createForm.password) return;
    setCreatingUser(true);

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        action: 'CREATE_USER',
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        plan: createForm.plan,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setCreateForm({ fullName: '', email: '', password: '', role: 'USER', plan: 'FREE' });
      await fetchUsers();
    } else {
      alert(data.error || 'No se pudo crear el usuario.');
    }

    setCreatingUser(false);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ type: genType, prompt }),
      });
      const data = await res.json();
      if (data.success) {
        setPrompt('');
        alert('Contenido materializado con éxito en el shard correspondiente.');
      } else {
        alert(`Error en la materialización: ${data.error || 'Error desconocido'}`);
      }
    } catch {
      alert('Error de conexión con el generador.');
    } finally {
      setIsGenerating(false);
    }
  }

  if (!isAdmin) {
    return <div className="p-20 text-center font-headline text-2xl text-secondary animate-pulse">Acceso denegado. Solo Chef Ejecutivo Aura.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">Mando central</p>
          <h1 className="text-5xl font-headline font-light text-on-surface underline decoration-secondary/30 decoration-8 underline-offset-[12px]">
            Admin <span className="italic text-secondary">Aura</span>
          </h1>
        </div>
        <div className="flex gap-4">
          {['USERS', 'CONTENT'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'USERS' | 'CONTENT')}
              className={`px-8 py-3 rounded-full font-label text-[9px] uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-secondary text-black font-bold' : 'glass-panel text-on-surface-variant'
              }`}
            >
              {tab === 'USERS' ? 'Gestión miembros' : 'Generador IA'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'USERS' && (
        <div className="space-y-8 animate-fade-in">
          <section className="glass-panel rounded-[32px] border border-secondary/20 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <input value={createForm.fullName} onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Nombre completo" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none text-sm" />
                <input value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none text-sm" />
                <input value={createForm.password} onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Contraseña" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none text-sm" />
                <select value={createForm.role} onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))} className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none text-sm">
                  <option value="USER">USER</option>
                  <option value="CHEF">CHEF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select value={createForm.plan} onChange={(e) => setCreateForm((prev) => ({ ...prev, plan: e.target.value }))} className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none text-sm">
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
              <button
                onClick={handleCreateUser}
                disabled={creatingUser || !createForm.email || !createForm.password}
                className="bg-secondary text-black px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-40"
              >
                {creatingUser ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </section>

          <div className="glass-panel overflow-hidden rounded-[40px] border border-outline-variant/10 shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-outline-variant/5">
                  <th className="p-8 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Usuario</th>
                  <th className="p-8 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Rol / Plan</th>
                  <th className="p-8 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Estado</th>
                  <th className="p-8 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Expiración</th>
                  <th className="p-8 font-label text-[9px] uppercase tracking-widest text-[#afcdc3]/40">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center animate-pulse text-secondary text-xs uppercase tracking-widest">
                      Sincronizando archivos maestro...
                    </td>
                  </tr>
                ) : (
                  users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-surface-container-high/30 transition-all group">
                      <td className="p-8">
                        <div className="flex flex-col">
                          <span className="font-headline text-lg text-on-surface group-hover:text-secondary transition-colors">{userItem.full_name || 'Chef sin nombre'}</span>
                          <span className="text-[10px] font-body text-on-surface-variant font-light">{userItem.email}</span>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-label uppercase tracking-widest ${userItem.role === 'ADMIN' ? 'bg-secondary text-black' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                            {userItem.role}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[8px] font-label uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                            {userItem.plan}
                          </span>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`text-[9px] font-label uppercase tracking-widest ${userItem.status === 'BLOCKED' ? 'text-error' : 'text-success'}`}>
                          {userItem.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-8 font-body text-xs text-on-surface-variant">
                        {userItem.subscription_ends_at ? new Date(userItem.subscription_ends_at).toLocaleDateString() : 'Lifetime'}
                      </td>
                      <td className="p-8">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          {userItem.status !== 'BLOCKED' ? (
                            <button onClick={() => handleAction(userItem.id, 'BLOCK')} className="p-2 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-all" title="Bloquear">
                              <AppIcon name="block" size={16} />
                            </button>
                          ) : (
                            <button onClick={() => handleAction(userItem.id, 'UNBLOCK')} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all" title="Desbloquear">
                              <AppIcon name="lock_open" size={16} />
                            </button>
                          )}
                          <button onClick={() => handleAction(userItem.id, 'SET_PLAN', 'PRO')} className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary hover:text-black transition-all text-[8px] font-bold">PRO</button>
                          <button onClick={() => handleAction(userItem.id, 'SET_PLAN', 'ENTERPRISE')} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all text-[8px] font-bold">EMP</button>
                          <button onClick={() => handleAction(userItem.id, 'GIFT_TIME', 30)} className="p-2 bg-surface-container-highest text-on-surface rounded-lg hover:bg-on-surface hover:text-surface transition-all text-[8px] font-bold">+30D</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'CONTENT' && (
        <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
          <div className="glass-panel p-12 rounded-[40px] border border-outline-variant/10 shadow-2xl">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/20">
                <AppIcon name="psychology" size={32} className="text-secondary" />
              </div>
              <div>
                <h3 className="text-3xl font-headline text-on-surface">
                  Generador <span className="italic text-secondary">Kimi</span>
                </h3>
                <p className="text-on-surface-variant font-light text-sm">Dicta tu visión gastronómica a la IA para crear contenido estructurado.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-4">
                {['RECIPE', 'COURSE', 'INGREDIENT'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setGenType(type as 'RECIPE' | 'COURSE' | 'INGREDIENT')}
                    className={`py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest border transition-all ${genType === type ? 'bg-secondary text-black border-secondary font-bold' : 'bg-surface-container-high/50 text-on-surface-variant border-outline-variant/10 hover:border-secondary/30'}`}
                  >
                    {type === 'RECIPE' ? 'Receta' : type === 'COURSE' ? 'Curso' : 'Ingrediente'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="font-label text-[10px] uppercase tracking-widest text-secondary ml-1">Concepto o idea</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej.: crea una receta de vanguardia utilizando emulsión de piñones y técnica de liofilización para el plan PRO..."
                  className="w-full bg-[#1a1c1b] border border-outline-variant/10 rounded-3xl p-8 text-on-surface font-light focus:outline-none focus:border-secondary/30 transition-all shadow-xl min-h-[200px] text-base leading-relaxed"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full bg-secondary text-black py-6 rounded-3xl font-label text-[12px] uppercase tracking-[0.2em] font-bold shadow-2xl shadow-secondary/20 hover:shadow-secondary/40 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Sincronizando con Kimi...
                  </>
                ) : (
                  <>
                    <AppIcon name="auto_awesome" size={20} />
                    Materializar contenido
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-4">
            <AppIcon name="info" size={20} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-on-surface-variant font-light leading-relaxed">
              <span className="text-primary font-medium">Nota técnica:</span> al materializar contenido, el generador crea los metadatos necesarios
              y los inserta directamente en el shard correspondiente. El contenido queda visible de forma inmediata para el plan seleccionado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
