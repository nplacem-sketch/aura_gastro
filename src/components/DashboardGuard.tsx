'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';

const PUBLIC_DASHBOARD_ROUTES = new Set(['/plans']);

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && !PUBLIC_DASHBOARD_ROUTES.has(pathname)) {
      router.replace('/login');
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-secondary font-label text-xs uppercase tracking-[0.4em] animate-pulse">
        Sincronizando identidad...
      </div>
    );
  }

  if (!user && !PUBLIC_DASHBOARD_ROUTES.has(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface-variant font-body">
        Redirigiendo al acceso seguro...
      </div>
    );
  }

  return <>{children}</>;
}
