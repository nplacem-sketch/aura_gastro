'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type ProfileDetails = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  cv_url: string | null;
  cv_name: string | null;
  role: string;
  plan: string;
  status: string;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  created_at: string;
};

type ContentRequest = {
  id: string;
  type: string;
  title: string;
  details: string | null;
  status: string;
  created_at: string;
};

const PLAN_OPTIONS = ['FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'] as const;

type Contact = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  plan?: string | null;
  name?: string | null;
  contact_email?: string | null;
  website?: string | null;
  description?: string | null;
};

type Room = {
  id: string;
  owner_user_id: string | null;
  peer_user_id: string | null;
  business_id: string | null;
  counterpart_type?: 'USER' | 'BUSINESS';
  counterpart_id?: string | null;
  counterpart_name?: string | null;
  counterpart_subtitle?: string | null;
  created_at: string;
};

type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string | null;
  sender_name: string;
  content: string;
  created_at: string;
};

type MessagingPayload = {
  messagingAllowed: boolean;
  permissions: {
    canMessageUsers: boolean;
    canMessageBusinesses: boolean;
  };
  contacts: {
    users: Contact[];
    businesses: Contact[];
  };
  roomDirectory: {
    users: Contact[];
    businesses: Contact[];
  };
  rooms: Room[];
  messages: RoomMessage[];
};

const emptyMessagingState: MessagingPayload = {
  messagingAllowed: false,
  permissions: {
    canMessageUsers: false,
    canMessageBusinesses: false,
  },
  contacts: {
    users: [],
    businesses: [],
  },
  roomDirectory: {
    users: [],
    businesses: [],
  },
  rooms: [],
  messages: [],
};

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, session, plan, role, signOut } = useAuth();
  const accessToken = session?.access_token ?? null;
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [requestForm, setRequestForm] = useState({
    type: 'COURSE',
    title: '',
    quantity: 1,
    targetPlans: ['PREMIUM'],
    details: '',
  });
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [messaging, setMessaging] = useState<MessagingPayload>(emptyMessagingState);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [messagingMessage, setMessagingMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isAdmin = role === 'ADMIN';
  const canUploadCv = isAdmin || plan === 'PREMIUM' || plan === 'ENTERPRISE';

  useEffect(() => {
    if (!user || !accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfileWorkspace() {
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${accessToken}` };
        const [profileRes, requestsRes, messagingRes] = await Promise.all([
          fetch('/api/profile/details', { headers, cache: 'no-store' }),
          isAdmin ? fetch('/api/profile/content-requests', { headers, cache: 'no-store' }) : Promise.resolve(null),
          fetch('/api/private-messages', { headers, cache: 'no-store' }),
        ]);

        if (!profileRes.ok) throw new Error('No se pudo cargar el perfil.');
        const nextProfile = await profileRes.json();
        if (!cancelled) setProfile(nextProfile);

        if (requestsRes) {
          const nextRequests = await requestsRes.json();
          if (!cancelled) setRequests(nextRequests.requests ?? []);
        } else if (!cancelled) {
          setRequests([]);
        }

        if (!messagingRes.ok) throw new Error('No se pudo cargar la mensajería privada.');
        const nextMessaging = (await messagingRes.json()) as MessagingPayload;
        if (!cancelled) {
          setMessaging({ ...emptyMessagingState, ...nextMessaging });
          setSelectedRoomId((current) => {
            if (current && nextMessaging.rooms.some((room) => room.id === current)) return current;
            return nextMessaging.rooms[0]?.id || '';
          });
        }
      } catch (error: any) {
        if (!cancelled) setProfileMessage(error.message || 'No se pudo cargar el área de perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfileWorkspace();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAdmin, user, userId]);

  const roomMessages = useMemo(
    () =>
      messaging.messages
        .filter((message) => message.room_id === selectedRoomId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messaging.messages, selectedRoomId],
  );

  const selectedRoom = useMemo(
    () => messaging.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [messaging.rooms, selectedRoomId],
  );

  async function syncSessionMetadata(nextProfile: ProfileDetails) {
    try {
      await supabase().auth.updateUser({
        data: {
          full_name: nextProfile.full_name,
          avatar_url: nextProfile.avatar_url,
        },
      });
    } catch {}
  }

  async function patchProfile(payload: Record<string, string | null>) {
    if (!accessToken) return;

    setSavingProfile(true);
    setProfileMessage('');

    try {
      const res = await fetch('/api/profile/details', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el perfil.');

      setProfile(data);
      await syncSessionMetadata(data);
      setProfileMessage('Perfil actualizado correctamente.');
    } catch (error: any) {
      setProfileMessage(error.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('La foto de perfil debe ser una imagen.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setProfileMessage('La foto de perfil no puede superar 1 MB.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    await patchProfile({ avatar_url: dataUrl });
  }

  async function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setProfileMessage('El CV debe subirse en formato PDF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage('El CV no puede superar 2 MB.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    await patchProfile({ cv_url: dataUrl, cv_name: file.name });
  }

  async function submitContentRequest() {
    if (!accessToken || !requestForm.title.trim()) return;

    setSavingRequest(true);
    setRequestMessage('');

    try {
      const res = await fetch('/api/profile/content-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la solicitud.');

      setRequests((current) => [data.request, ...current]);
      setRequestForm({ type: 'COURSE', title: '', quantity: 1, targetPlans: ['PREMIUM'], details: '' });
      setRequestMessage('Solicitud registrada en la cola editorial.');
    } catch (error: any) {
      setRequestMessage(error.message || 'No se pudo registrar la solicitud.');
    } finally {
      setSavingRequest(false);
    }
  }

  async function startConversation(target: { type: 'USER' | 'BUSINESS'; id: string }) {
    if (!accessToken) return;
    setMessagingMessage('');

    try {
      const res = await fetch('/api/private-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'START_ROOM',
          targetUserId: target.type === 'USER' ? target.id : undefined,
          businessId: target.type === 'BUSINESS' ? target.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la conversación.');

      setMessaging((current) => {
        const room = data.room as Room;
        const exists = current.rooms.some((item) => item.id === room.id);
        return {
          ...current,
          rooms: exists ? current.rooms : [room, ...current.rooms],
        };
      });
      setSelectedRoomId(data.room.id);
    } catch (error: any) {
      setMessagingMessage(error.message || 'No se pudo abrir la conversación.');
    }
  }

  async function sendMessage() {
    if (!accessToken || !selectedRoomId || !draftMessage.trim()) return;

    setSendingMessage(true);
    setMessagingMessage('');

    try {
      const res = await fetch('/api/private-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'SEND_MESSAGE',
          roomId: selectedRoomId,
          content: draftMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');

      const refreshRes = await fetch('/api/private-messages', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const refreshData = (await refreshRes.json()) as MessagingPayload;
      if (!refreshRes.ok) throw new Error((refreshData as any).error || 'No se pudo refrescar la bandeja.');

      setMessaging({ ...emptyMessagingState, ...refreshData });
      setDraftMessage('');
    } catch (error: any) {
      setMessagingMessage(error.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSendingMessage(false);
    }
  }

  async function openBillingPortal() {
    if (!accessToken) return;

    setPortalLoading(true);
    setProfileMessage('');

    try {
      const res = await fetch('/api/plans/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      if (res.status === 400) {
        window.location.href = '/plans';
        return;
      }

      throw new Error(data.error || 'No se pudo abrir el portal de cliente.');
    } catch (error: any) {
      setProfileMessage(error.message || 'No se pudo abrir el portal de cliente.');
    } finally {
      setPortalLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AppIcon name="lock" size={48} className="mb-6 text-secondary/20" />
        <h2 className="mb-4 text-3xl font-headline text-on-surface">Acceso restringido</h2>
        <p className="mb-8 max-w-md font-light text-on-surface-variant">
          Debes iniciar sesión para ver tu perfil maestro.
        </p>
        <Link href="/login" className="rounded-full bg-secondary px-8 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:bg-secondary/80">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-panel rounded-[32px] border border-outline-variant/10 p-10 text-sm text-on-surface-variant">
        Sincronizando perfil maestro...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 font-label text-[10px] uppercase tracking-[0.4em] text-secondary">Identidad gastronómica</p>
          <h1 className="text-5xl font-headline font-light text-on-surface">
            Centro de <span className="italic text-secondary">perfil</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light text-on-surface-variant">
            Gestiona tu identidad, tu CV profesional, las solicitudes de nuevo contenido y la mensajería privada con usuarios o empresas colaboradoras.
          </p>
        </div>
        <button onClick={() => signOut()} className="rounded-full border border-error/30 px-6 py-2 font-label text-[10px] uppercase tracking-widest text-error/70 transition-all hover:bg-error/5 hover:text-error">
          Cerrar sesión
        </button>
      </header>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-8">
          <section className="glass-panel relative overflow-hidden rounded-[32px] border border-outline-variant/10 p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent opacity-60" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-[#121413] bg-surface-container-highest shadow-2xl">
                {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                  <img src={(profile?.avatar_url || user.user_metadata?.avatar_url) as string} className="h-full w-full object-cover" alt="Foto de perfil" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <AppIcon name="person" size={48} className="text-secondary/20" />
                  </div>
                )}
              </div>

              <h2 className="mb-1 text-2xl font-headline text-on-surface">{profile?.full_name || user.user_metadata?.full_name || 'Chef Aura'}</h2>
              <p className="mb-4 font-label text-[10px] uppercase tracking-[0.25em] text-secondary">
                {isAdmin ? 'Executive Chef' : 'Profesional gastronómico'}
              </p>

              <div className="mb-6 inline-flex rounded-full border border-secondary/20 bg-surface-container-highest px-4 py-1.5 font-label text-[9px] uppercase tracking-widest text-on-surface-variant">
                {isAdmin ? 'ENTERPRISE | ADMIN' : `${plan} | ${role}`}
              </div>

              <label className={`mb-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-secondary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 ${savingProfile ? 'pointer-events-none opacity-60' : ''}`}>
                <AppIcon name="edit" size={14} />
                Cambiar foto
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>

              {(profile?.avatar_url || user.user_metadata?.avatar_url) && (
                <button onClick={() => void patchProfile({ avatar_url: null })} disabled={savingProfile} className="w-full rounded-2xl border border-outline-variant/20 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50">
                  Quitar foto
                </button>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8">
            <h3 className="mb-5 text-xl font-headline text-on-surface">Datos de cuenta</h3>
            <div className="space-y-4 text-sm text-on-surface">
              <div>
                <p className="mb-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Email principal</p>
                <p>{profile?.email || user.email}</p>
              </div>
              <div>
                <p className="mb-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Miembro desde</p>
                <p>{formatDate(profile?.created_at || user.created_at)}</p>
              </div>
              <div>
                <p className="mb-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Estado actual</p>
                <p>{profile?.status || 'ACTIVE'} · {profile?.subscription_status || 'inactive'}</p>
              </div>
              {profile?.subscription_ends_at && (
                <div>
                  <p className="mb-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Vigencia</p>
                  <p>Hasta {formatDate(profile.subscription_ends_at)}</p>
                </div>
              )}
            </div>

            {profileMessage && (
              <p className="mt-5 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm text-on-surface-variant">
                {profileMessage}
              </p>
            )}
          </section>

          {canUploadCv && (
            <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8">
              <h3 className="mb-3 text-xl font-headline text-on-surface">CV profesional</h3>
              <p className="mb-5 text-sm font-light text-on-surface-variant">
                Sube tu currículum en PDF para compartirlo con empresas colaboradoras dentro de la mensajería privada.
              </p>
              <label className={`mb-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-white transition-all hover:opacity-90 ${savingProfile ? 'pointer-events-none opacity-60' : ''}`}>
                <AppIcon name="description" size={14} />
                Subir CV
                <input type="file" accept="application/pdf" className="hidden" onChange={handleCvChange} />
              </label>
              {profile?.cv_url && profile?.cv_name && (
                <>
                  <a href={profile.cv_url} download={profile.cv_name} className="mb-3 flex items-center justify-between rounded-2xl border border-outline-variant/20 px-4 py-3 text-sm text-on-surface transition-all hover:bg-surface-container-high">
                    <span>{truncate(profile.cv_name, 34)}</span>
                    <AppIcon name="arrow_forward" size={14} />
                  </a>
                  <button onClick={() => void patchProfile({ cv_url: null, cv_name: null })} disabled={savingProfile} className="w-full rounded-2xl border border-outline-variant/20 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50">
                    Quitar CV
                  </button>
                </>
              )}
            </section>
          )}
        </aside>

        <div className="space-y-8">
          <section id="mensajeria-privada" className="glass-panel rounded-[32px] border border-outline-variant/10 p-8 md:p-10">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-headline text-on-surface">Mensajería privada</h3>
                <p className="mt-2 text-sm font-light text-on-surface-variant">
                  {isAdmin
                    ? 'Puedes abrir canales privados con usuarios y empresas, y responder a cualquier conversación activa.'
                    : messaging.permissions.canMessageBusinesses
                      ? 'Tu plan te permite contactar por privado con empresas colaboradoras y mantener conversaciones activas.'
                      : 'Verás aquí tus conversaciones activas. Para abrir nuevos canales con empresas necesitas PREMIUM.'}
                </p>
              </div>
              {isAdmin && (
                <Link href="/admin" className="inline-flex items-center gap-3 rounded-2xl border border-secondary/20 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-secondary transition-all hover:bg-secondary/10">
                  <AppIcon name="admin_panel_settings" size={14} />
                  Panel de administración
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-6">
                {messaging.permissions.canMessageUsers && messaging.contacts.users.length > 0 && (
                  <div>
                    <p className="mb-3 font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Usuarios</p>
                    <div className="space-y-3">
                      {messaging.contacts.users.map((contact) => (
                        <button key={contact.id} onClick={() => void startConversation({ type: 'USER', id: contact.id })} className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-high/20 px-4 py-3 text-left transition-all hover:border-secondary/30 hover:bg-surface-container-high">
                          <p className="text-sm text-on-surface">{contact.full_name || contact.email || 'Usuario'}</p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">{(contact.role || 'USER')} · {contact.plan || 'FREE'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messaging.permissions.canMessageBusinesses && messaging.contacts.businesses.length > 0 && (
                  <div>
                    <p className="mb-3 font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Empresas</p>
                    <div className="space-y-3">
                      {messaging.contacts.businesses.map((business) => (
                        <button key={business.id} onClick={() => void startConversation({ type: 'BUSINESS', id: business.id })} className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-high/20 px-4 py-3 text-left transition-all hover:border-secondary/30 hover:bg-surface-container-high">
                          <p className="text-sm text-on-surface">{business.name || 'Empresa'}</p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">{business.contact_email || business.website || 'Canal privado empresarial'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-3 font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Bandeja activa</p>
                  <div className="space-y-3">
                    {messaging.rooms.length === 0 ? (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-5 text-sm text-on-surface-variant">
                        No hay conversaciones activas todavía.
                      </div>
                    ) : (
                      messaging.rooms.map((room) => (
                        <button key={room.id} onClick={() => setSelectedRoomId(room.id)} className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${room.id === selectedRoomId ? 'border-secondary/40 bg-secondary/10' : 'border-outline-variant/10 bg-surface-container-high/10 hover:border-secondary/20 hover:bg-surface-container-high/20'}`}>
                          <p className="text-sm text-on-surface">{room.counterpart_name || 'Conversación privada'}</p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">{room.counterpart_subtitle || 'Canal privado'}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-outline-variant/10 bg-surface-container-high/10 p-6 md:p-8">
                {selectedRoom ? (
                  <>
                    <div className="mb-6 border-b border-outline-variant/10 pb-5">
                      <p className="font-label text-[10px] uppercase tracking-[0.35em] text-secondary">
                        {selectedRoom.counterpart_type === 'BUSINESS' ? 'Empresa' : 'Canal privado'}
                      </p>
                      <h4 className="mt-2 text-3xl font-headline text-on-surface">{selectedRoom.counterpart_name || 'Conversación'}</h4>
                      <p className="mt-2 text-sm text-on-surface-variant">{selectedRoom.counterpart_subtitle || 'Mensajería privada segura'}</p>
                    </div>

                    <div className="mb-6 max-h-[380px] space-y-4 overflow-y-auto pr-2">
                      {roomMessages.length === 0 ? (
                        <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-5 text-sm text-on-surface-variant">
                          Abre la conversación con tu primer mensaje.
                        </div>
                      ) : (
                        roomMessages.map((message) => {
                          const ownMessage = message.user_id === user.id;
                          return (
                            <div key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-[24px] px-5 py-4 ${ownMessage ? 'bg-secondary text-black' : 'border border-outline-variant/10 bg-surface text-on-surface'}`}>
                                <p className={`mb-2 text-[10px] uppercase tracking-[0.2em] ${ownMessage ? 'text-black/70' : 'text-secondary'}`}>{message.sender_name}</p>
                                <p className={`text-sm leading-6 ${ownMessage ? 'text-black' : 'text-on-surface'}`}>{message.content}</p>
                                <p className={`mt-3 text-[11px] ${ownMessage ? 'text-black/60' : 'text-on-surface-variant'}`}>{formatDateTime(message.created_at)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="rounded-[24px] border border-outline-variant/10 bg-surface px-4 py-4">
                      <textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        rows={4}
                        placeholder={selectedRoom.counterpart_type === 'BUSINESS' ? 'Escribe tu propuesta, disponibilidad o presentación profesional...' : 'Escribe tu mensaje privado...'}
                        className="w-full resize-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                      />
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <p className="text-[11px] text-on-surface-variant">
                          {selectedRoom.counterpart_type === 'BUSINESS' && profile?.cv_name ? `Tu CV activo es ${profile.cv_name}.` : 'La conversación queda registrada de forma privada.'}
                        </p>
                        <button onClick={() => void sendMessage()} disabled={sendingMessage || !draftMessage.trim()} className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                          <AppIcon name="send" size={14} />
                          {sendingMessage ? 'Enviando' : 'Enviar'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                    <AppIcon name="forum" size={42} className="mb-5 text-secondary/30" />
                    <h4 className="text-2xl font-headline text-on-surface">Selecciona una conversación</h4>
                    <p className="mt-3 max-w-md text-sm font-light text-on-surface-variant">
                      Abre un canal privado desde el directorio lateral o accede a una conversación ya activa desde tu bandeja.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {messagingMessage && (
              <p className="mt-5 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm text-on-surface-variant">
                {messagingMessage}
              </p>
            )}
          </section>

          <section className="glass-panel rounded-[32px] border border-outline-variant/10 p-8 md:p-10">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-headline text-on-surface">Suscripción Aura</h3>
                <p className="mt-2 text-sm font-light text-on-surface-variant">
                  Tu plan actual determina el acceso a cursos, recetario, laboratorio, fichas técnicas y mensajería profesional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void openBillingPortal()}
                disabled={portalLoading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-secondary px-5 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 disabled:cursor-wait disabled:opacity-70 md:w-auto"
              >
                <AppIcon name="workspace_premium" size={14} />
                {portalLoading ? 'Abriendo portal...' : 'Gestionar plan'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Plan activo</p>
                <p className="mt-3 text-2xl font-headline text-on-surface">{isAdmin ? 'ENTERPRISE' : plan}</p>
              </div>
              <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Rol operativo</p>
                <p className="mt-3 text-2xl font-headline text-on-surface">{role}</p>
              </div>
              <div className="rounded-[24px] border border-outline-variant/10 bg-surface-container-high/10 p-5">
                <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Mensajería empresarial</p>
                <p className="mt-3 text-2xl font-headline text-on-surface">
                  {messaging.permissions.canMessageBusinesses ? 'Activa' : 'Bloqueada'}
                </p>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="glass-panel rounded-[32px] border border-secondary/20 p-8 md:p-10">
              <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-headline text-on-surface">Solicitar nuevo contenido</h3>
                  <p className="mt-2 text-sm font-light text-on-surface-variant">
                    Desde aquí puedes pedir más cursos, recetas, ingredientes, técnicas, fichas técnicas o escandallos para la siguiente oleada editorial.
                  </p>
                </div>
                <Link href="/admin" className="inline-flex items-center gap-3 rounded-2xl border border-secondary/20 px-5 py-3 font-label text-[10px] uppercase tracking-widest text-secondary transition-all hover:bg-secondary/10">
                  <AppIcon name="arrow_forward" size={14} />
                  Gestión avanzada
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Tipo de contenido
                      </span>
                      <select value={requestForm.type} onChange={(event) => setRequestForm((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none">
                        <option value="COURSE">Curso</option>
                        <option value="RECIPE">Receta</option>
                        <option value="INGREDIENT">Ingrediente</option>
                        <option value="TECHNIQUE">Técnica</option>
                        <option value="TECHNICAL_SHEET">Ficha técnica</option>
                        <option value="COSTING">Escandallo</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Título
                      </span>
                      <input value={requestForm.title} onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Curso avanzado de fermentaciones" className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Cantidad solicitada
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={requestForm.quantity}
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            quantity: Math.max(1, Number(event.target.value || 1)),
                          }))
                        }
                        className="w-full rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none"
                      />
                    </label>

                    <div className="block">
                      <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Plan o planes destino
                      </span>
                      <div className="flex flex-wrap gap-2 rounded-[24px] border border-outline-variant/10 bg-surface px-4 py-4">
                        {PLAN_OPTIONS.map((planItem) => {
                          const active = requestForm.targetPlans.includes(planItem);
                          return (
                            <button
                              key={planItem}
                              type="button"
                              onClick={() =>
                                setRequestForm((current) => {
                                  const exists = current.targetPlans.includes(planItem);
                                  const nextPlans = exists
                                    ? current.targetPlans.filter((item) => item !== planItem)
                                    : [...current.targetPlans, planItem];

                                  return {
                                    ...current,
                                    targetPlans: nextPlans.length > 0 ? nextPlans : current.targetPlans,
                                  };
                                })
                              }
                              className={`rounded-full px-4 py-2 font-label text-[10px] uppercase tracking-widest transition-all ${
                                active
                                  ? 'bg-secondary text-on-secondary'
                                  : 'border border-outline-variant/20 text-on-surface-variant hover:border-secondary/30 hover:text-on-surface'
                              }`}
                            >
                              {planItem}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Detalle editorial
                    </span>
                    <textarea value={requestForm.details} onChange={(event) => setRequestForm((current) => ({ ...current, details: event.target.value }))} rows={6} placeholder="Describe el enfoque, nivel técnico, referencias gastronómicas, plan objetivo y prioridad operativa." className="w-full resize-none rounded-[24px] border border-outline-variant/10 bg-surface px-4 py-4 text-sm text-on-surface outline-none placeholder:text-on-surface-variant" />
                  </label>

                  <button onClick={() => void submitContentRequest()} disabled={savingRequest || !requestForm.title.trim() || requestForm.targetPlans.length === 0} className="inline-flex items-center gap-3 rounded-2xl bg-secondary px-6 py-3 font-label text-[10px] uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                    <AppIcon name="add_circle" size={14} />
                    {savingRequest ? 'Registrando solicitud' : 'Solicitar contenido'}
                  </button>

                  {requestMessage && (
                    <p className="rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm text-on-surface-variant">
                      {requestMessage}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-3 font-label text-[10px] uppercase tracking-[0.3em] text-secondary">Solicitudes recientes</p>
                  <div className="space-y-3">
                    {requests.length === 0 ? (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-5 text-sm text-on-surface-variant">
                        Todavía no has enviado solicitudes editoriales.
                      </div>
                    ) : (
                      requests.map((request) => (
                        <article key={request.id} className="rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-4">
                          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-secondary">
                            {request.type} · {request.status}
                          </p>
                          <h4 className="mt-2 text-sm text-on-surface">{request.title}</h4>
                          {request.details && (
                            <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                              {truncate(request.details.replace(/\n/g, ' · '), 180)}
                            </p>
                          )}
                          <p className="mt-3 text-[11px] text-on-surface-variant">{formatDateTime(request.created_at)}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
