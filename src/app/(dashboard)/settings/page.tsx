'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type ProfileDetails = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  cv_url: string | null;
  cv_name: string | null;
  role: string;
  plan: string;
};

type Preferences = {
  publicName: string;
  language: string;
  notifyRecipes: boolean;
  notifyAcademy: boolean;
  notifyMessages: boolean;
};

const STORAGE_KEY = 'aura-settings-preferences';

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { user, session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    publicName: '',
    language: 'Español (Castellano)',
    notifyRecipes: true,
    notifyAcademy: true,
    notifyMessages: true,
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPreferences((current) => ({ ...current, ...JSON.parse(stored) }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile/details', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la configuración.');

        if (!cancelled) {
          setProfile(data);
          setPreferences((current) => ({
            ...current,
            publicName: current.publicName || data.full_name || '',
          }));
        }
      } catch (error: any) {
        if (!cancelled) setMessage(error.message || 'No se pudo cargar la configuración.');
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function patchProfile(payload: Record<string, string | null>) {
    if (!accessToken) return;

    const res = await fetch('/api/profile/details', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar el perfil.');

    setProfile(data);
    await supabase().auth.updateUser({
      data: {
        full_name: data.full_name,
        avatar_url: data.avatar_url,
      },
    });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('La foto de perfil debe ser una imagen.');
      return;
    }

    if (file.size > 1024 * 1024) {
      setMessage('La foto de perfil no puede superar 1 MB.');
      return;
    }

    try {
      setSaving(true);
      const avatarUrl = await fileToDataUrl(file);
      await patchProfile({ avatar_url: avatarUrl });
      setMessage('Foto de perfil actualizada.');
    } catch (error: any) {
      setMessage(error.message || 'No se pudo actualizar la foto de perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      await patchProfile({ full_name: preferences.publicName.trim() || profile?.full_name || 'Chef Aura' });
      setMessage('Configuración guardada correctamente.');
    } catch (error: any) {
      setMessage(error.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <header className="mb-10">
        <p className="mb-2 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
          Configuración maestra
        </p>
        <h1 className="text-5xl font-headline font-light text-on-surface">
          Panel de <span className="italic text-secondary">ajustes</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-light text-on-surface-variant">
          Ajusta tu identidad visible, la foto de perfil y tus preferencias locales de alertas. La mensajería privada y la actividad reciente están disponibles directamente desde tu perfil y desde la campana superior.
        </p>
      </header>

      <div className="space-y-6">
        <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[#121413] bg-surface-container-highest shadow-2xl">
                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img
                    src={(profile?.avatar_url || user?.user_metadata?.avatar_url) as string}
                    className="h-full w-full object-cover"
                    alt="Foto de perfil"
                  />
                ) : (
                  <AppIcon name="person" size={44} className="text-secondary/20" />
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-secondary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:opacity-90">
                <AppIcon name="edit" size={14} />
                Subir foto
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div>
              <h2 className="mb-6 text-2xl font-headline text-on-surface">Preferencias de perfil</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Nombre público
                  </span>
                  <input
                    value={preferences.publicName}
                    onChange={(event) => setPreferences((current) => ({ ...current, publicName: event.target.value }))}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Idioma de interfaz
                  </span>
                  <select
                    value={preferences.language}
                    onChange={(event) => setPreferences((current) => ({ ...current, language: event.target.value }))}
                    className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"
                  >
                    <option>Español (Castellano)</option>
                    <option>English (UK)</option>
                    <option>Français</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                  <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Cuenta</p>
                  <p className="mt-3 text-sm text-on-surface">{profile?.email || user?.email}</p>
                </div>
                <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                  <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Rol</p>
                  <p className="mt-3 text-sm text-on-surface">{profile?.role || 'USER'}</p>
                </div>
                <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                  <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Plan</p>
                  <p className="mt-3 text-sm text-on-surface">{profile?.plan || 'FREE'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-headline text-on-surface">Notificaciones y alertas</h3>
              <p className="mt-2 text-sm font-light text-on-surface-variant">
                Estas preferencias se guardan en este navegador y complementan el panel activo de la campana.
              </p>
            </div>
            <Link
              href="/profile#mensajeria-privada"
              className="inline-flex items-center gap-3 rounded-2xl border border-secondary/20 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-secondary transition-all hover:bg-secondary/10"
            >
              <AppIcon name="forum" size={14} />
              Ir a mensajería
            </Link>
          </div>

          <div className="space-y-4">
            {[
              ['notifyRecipes', 'Nuevas recetas maestras', 'Avisos cuando se publiquen nuevas recetas en el recetario.'],
              ['notifyAcademy', 'Actualizaciones del campus', 'Alertas sobre cursos, módulos y exámenes recién disponibles.'],
              ['notifyMessages', 'Mensajes privados', 'Alertas visibles en la campana cuando llegue un mensaje nuevo.'],
            ].map(([key, title, description]) => (
              <button
                key={key}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    [key]: !current[key as keyof Preferences],
                  }))
                }
                className="flex w-full items-center justify-between rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 px-5 py-5 text-left transition-all hover:border-secondary/20 hover:bg-surface-container-high/20"
              >
                <div>
                  <h4 className="text-sm text-on-surface">{title}</h4>
                  <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{description}</p>
                </div>
                <div
                  className={`relative h-7 w-14 rounded-full transition-all ${
                    preferences[key as keyof Preferences] ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      preferences[key as keyof Preferences] ? 'right-1' : 'left-1'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8">
          <h3 className="text-2xl font-headline text-on-surface">Atajos operativos</h3>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link href="/profile" className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5 transition-all hover:border-secondary/20 hover:bg-surface-container-high/20">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Perfil</p>
              <p className="mt-3 text-sm text-on-surface">Gestiona tu foto, CV y centro de perfil.</p>
            </Link>
            <Link href="/profile#mensajeria-privada" className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5 transition-all hover:border-secondary/20 hover:bg-surface-container-high/20">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Mensajes</p>
              <p className="mt-3 text-sm text-on-surface">Abre conversaciones privadas con usuarios o empresas.</p>
            </Link>
            <Link href="/plans" className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5 transition-all hover:border-secondary/20 hover:bg-surface-container-high/20">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Plan</p>
              <p className="mt-3 text-sm text-on-surface">Revisa tu acceso y capacidades activas.</p>
            </Link>
          </div>
        </section>

        {message && (
          <p className="rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm text-on-surface-variant">
            {message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => void saveSettings()}
            disabled={saving}
            className="rounded-[20px] bg-secondary px-12 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando cambios' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
