'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AppIcon from '@/components/AppIcon';
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

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/' },
    { name: 'Academia', icon: 'school', href: '/academy' },
    { name: 'Sommelier', icon: 'wine_bar', href: '/chat' },
    { name: 'Recetario', icon: 'menu_book', href: '/recipes' },
    { name: 'Laboratorio', icon: 'biotech', href: '/lab' },
    { name: 'Escandallos', icon: 'receipt', href: '/escandallos' },
    { name: 'Fichas Técnicas', icon: 'description', href: '/fichas-tecnicas' },
    ...(isAdmin ? [{ name: 'Administración', icon: 'admin_panel_settings', href: '/admin' }] : []),
    { name: 'Perfil', icon: 'person_outline', href: '/profile' },
    { name: 'Configuración', icon: 'settings', href: '/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-[60] hidden h-screen w-[280px] flex-col bg-[#121413] p-4 md:flex">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] border border-secondary/40 bg-gradient-to-b from-secondary/5 to-transparent py-10">
        <div className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 bg-secondary/10 blur-[40px]" />

        <Link href="/" className="relative z-10 block px-6 transition-transform duration-500 hover:scale-105">
          <AuraLogo />
        </Link>

        <nav className="mt-6 flex-grow space-y-2 overflow-y-auto px-4 font-body text-[13px]">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-all ${
                  isActive
                    ? 'border border-outline-variant/10 bg-surface-container-high text-secondary shadow-lg'
                    : 'text-[#afcdc3]/60 hover:bg-surface-container-low/50 hover:text-[#afcdc3]'
                }`}
              >
                <AppIcon name={item.icon as any} size={20} className={isActive ? 'text-secondary' : 'text-current'} />
                <span className="font-light tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mx-4 mt-8 space-y-4 border-t border-secondary/10 px-8 pt-6 font-body text-[11px]">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-4 text-left font-light tracking-wide text-error/60 transition-all hover:text-error"
            >
              <AppIcon name="logout" size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
