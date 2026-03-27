'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import TierGateAction from '@/components/TierGateAction';
import { useAuth } from '@/lib/auth-context';

const AuraLogo = () => (
  <div className="mb-8 flex flex-col items-center justify-center pt-4">
    <h1 className="mb-0.5 font-headline text-3xl tracking-widest text-[#e2e3e0]" style={{ letterSpacing: '0.15em' }}>
      AURA
    </h1>
    <h2 className="font-headline text-[8px] uppercase tracking-[0.35em] text-secondary">Gastronomy</h2>
  </div>
);

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, isAdmin, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/', tier: null },
    { name: 'Academia', icon: 'school', href: '/academy', tier: null },
    { name: 'Sommelier', icon: 'wine_bar', href: '/chat', tier: null },
    { name: 'Recetario', icon: 'menu_book', href: '/recipes', tier: 'PRO' },
    { name: 'Laboratorio', icon: 'biotech', href: '/lab', tier: 'PRO' },
    { name: 'Escandallos', icon: 'receipt', href: '/escandallos', tier: 'PREMIUM' },
    { name: 'Fichas Tecnicas', icon: 'description', href: '/fichas-tecnicas', tier: 'PREMIUM' },
    ...(isAdmin ? [{ name: 'Administracion', icon: 'admin_panel_settings', href: '/admin', tier: null }] : []),
    { name: 'Perfil', icon: 'person_outline', href: '/profile', tier: null },
    { name: 'Configuracion', icon: 'settings', href: '/settings', tier: null },
  ];

  const renderMenuItems = (buildClassName: (isActive: boolean) => string) =>
    menuItems.map((item) => {
      const isActive = pathname === item.href;
      const className = buildClassName(isActive);
      const content = (
        <>
          <AppIcon name={item.icon as any} size={20} className={isActive ? 'text-secondary' : 'text-current'} />
          <span className="font-light tracking-wide">{item.name}</span>
        </>
      );

      if (item.tier) {
        return (
          <TierGateAction key={item.name} href={item.href} requiredTier={item.tier} className={className}>
            {content}
          </TierGateAction>
        );
      }

      return (
        <Link key={item.name} href={item.href} className={className}>
          {content}
        </Link>
      );
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-5 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/10 bg-[#171918]/95 text-on-surface shadow-xl shadow-black/30 backdrop-blur md:hidden"
        aria-label="Abrir menu"
      >
        <AppIcon name="more_horiz" size={18} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[95] md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cerrar menu"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[86vw] max-w-[320px] flex-col bg-[#121413] p-4">
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] border border-secondary/40 bg-gradient-to-b from-secondary/5 to-transparent py-8">
              <div className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 bg-secondary/10 blur-[40px]" />

              <div className="relative flex items-start justify-between px-6">
                <Link href="/" className="block transition-transform duration-500 hover:scale-105">
                  <AuraLogo />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-full border border-outline-variant/10 p-2 text-on-surface-variant"
                  aria-label="Cerrar menu lateral"
                >
                  <AppIcon name="close" size={16} />
                </button>
              </div>

              <nav className="mt-2 flex-grow space-y-2 overflow-y-auto px-4 font-body text-[13px]">
                {renderMenuItems((isActive) =>
                  `group relative flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-all ${
                    isActive
                      ? 'border border-outline-variant/10 bg-surface-container-high text-secondary shadow-lg'
                      : 'text-[#afcdc3]/70 hover:bg-surface-container-low/50 hover:text-[#afcdc3]'
                  }`
                )}
              </nav>

              {user && (
                <div className="mx-4 mt-6 space-y-4 border-t border-secondary/10 px-8 pt-6 font-body text-[11px]">
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-4 text-left font-light tracking-wide text-error/70 transition-all hover:text-error"
                  >
                    <AppIcon name="logout" size={18} />
                    <span>Cerrar sesion</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-[60] hidden h-screen w-[280px] flex-col bg-[#121413] p-4 md:flex">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] border border-secondary/40 bg-gradient-to-b from-secondary/5 to-transparent py-10">
          <div className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 bg-secondary/10 blur-[40px]" />

          <Link href="/" className="relative z-10 block px-6 transition-transform duration-500 hover:scale-105">
            <AuraLogo />
          </Link>

          <nav className="mt-6 flex-grow space-y-2 overflow-y-auto px-4 font-body text-[13px]">
            {renderMenuItems((isActive) =>
              `group relative flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-all ${
                isActive
                  ? 'border border-outline-variant/10 bg-surface-container-high text-secondary shadow-lg'
                  : 'text-[#afcdc3]/60 hover:bg-surface-container-low/50 hover:text-[#afcdc3]'
              }`
            )}
          </nav>

          {user && (
            <div className="mx-4 mt-8 space-y-4 border-t border-secondary/10 px-8 pt-6 font-body text-[11px]">
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-4 text-left font-light tracking-wide text-error/60 transition-all hover:text-error"
              >
                <AppIcon name="logout" size={18} />
                <span>Cerrar sesion</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
