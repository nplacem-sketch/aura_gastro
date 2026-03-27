'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
};

export default function TopBar() {
  const { user, plan, role, session } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!user || !accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) return;

        if (!cancelled) {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unread_count ?? 0);
        }
      } catch {}
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user]);

  const hasNotifications = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between bg-gradient-to-b from-[#121413] to-transparent pl-16 pr-4 transition-all sm:pr-6 md:left-[280px] md:h-24 md:px-12">
      <div className="hidden max-w-md flex-1 sm:block">
        <div className="group relative">
          <AppIcon
            name="search"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
          />
          <input
            type="text"
            placeholder="Buscar"
            className="w-full rounded-full border-none bg-[#1a1c1b] py-2.5 pl-12 pr-4 text-sm text-on-surface transition-all placeholder:text-on-surface-variant focus:bg-[#202221] focus:ring-1 focus:ring-secondary/50"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {!user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant transition-all hover:text-secondary"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-secondary px-4 py-2.5 font-label text-[10px] font-bold uppercase tracking-widest text-black shadow-lg shadow-secondary/10 transition-all hover:bg-secondary/80 sm:px-6"
            >
              Registrarse
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/profile#mensajeria-privada"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 px-3 py-2 text-[11px] text-on-surface-variant transition-all hover:border-secondary/30 hover:text-secondary sm:gap-3 sm:px-4"
            >
              <AppIcon name="forum" size={16} />
              <span className="hidden sm:inline">Mensajes</span>
            </Link>

            <div className="relative">
              <button
                aria-label="Notificaciones"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="group relative cursor-pointer text-[#afcdc3]/60 transition-all hover:text-secondary"
              >
                <AppIcon name="notifications" size={20} />
                {hasNotifications && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#121413] bg-secondary px-1 text-[9px] font-bold text-black">
                    {Math.min(unreadCount, 9)}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-10 w-[min(360px,calc(100vw-24px))] rounded-[28px] border border-outline-variant/10 bg-[#171918] p-4 shadow-2xl shadow-black/40">
                  <div className="mb-3 flex items-center justify-between px-2">
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary">
                        Notificaciones
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {hasNotifications ? `${unreadCount} alertas activas` : 'Sin alertas pendientes'}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                    >
                      <AppIcon name="close" size={14} />
                    </button>
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-5 text-sm text-on-surface-variant">
                        No hay notificaciones nuevas por ahora.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          onClick={() => setNotificationsOpen(false)}
                          className="block rounded-2xl border border-outline-variant/10 bg-surface-container-high/10 px-4 py-4 transition-all hover:border-secondary/30 hover:bg-surface-container-high/20"
                        >
                          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-secondary">
                            {notification.type}
                          </p>
                          <h4 className="mt-2 text-sm text-on-surface">{notification.title}</h4>
                          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                            {notification.body}
                          </p>
                          <p className="mt-3 text-[11px] text-on-surface-variant">
                            {new Date(notification.created_at).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/profile"
              className="group ml-1 flex cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 transition-all hover:bg-surface-container-low/50 sm:ml-2 sm:gap-3 sm:px-3"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-surface-container-highest transition-all group-hover:border-secondary/50">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    className="h-full w-full object-cover"
                    alt="Avatar del perfil"
                  />
                ) : (
                  <AppIcon name="person" className="text-secondary opacity-60" size={16} />
                )}
              </div>
              <div className="hidden text-left sm:flex sm:flex-col sm:justify-center">
                <p className="font-headline text-xs font-medium text-[#e2e3e0] transition-colors group-hover:text-secondary">
                  {user.user_metadata?.full_name || 'Chef Aura'}
                </p>
                <p className="text-[10px] font-light text-on-surface-variant">
                  {role === 'ADMIN' ? 'Executive Chef' : `${plan} Member`}
                </p>
              </div>
              <AppIcon
                name="expand_more"
                size={16}
                className="ml-1 text-on-surface-variant transition-colors group-hover:text-secondary"
              />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
