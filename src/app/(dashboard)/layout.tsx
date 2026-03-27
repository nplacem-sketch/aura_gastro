import Link from 'next/link';

import DashboardGuard from '@/components/DashboardGuard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="flex min-h-screen bg-surface text-on-surface font-body overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 md:ml-[280px] flex flex-col">
          <TopBar />
          <main className="flex-1 px-4 pb-12 pt-24 sm:px-6 md:px-12">
            {children}

            <footer className="mt-20 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[#afcdc3]/30">
              <div className="text-[10px] font-label uppercase tracking-[0.4em]">AURA GASTRONOMY</div>
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] font-label uppercase tracking-widest">
                <Link className="hover:text-primary transition-all whitespace-nowrap" href="/legal-notice">
                  Aviso Legal
                </Link>
                <Link className="hover:text-primary transition-all whitespace-nowrap" href="/privacy-policy">
                  Privacidad
                </Link>
                <Link className="hover:text-primary transition-all whitespace-nowrap" href="/terms">
                  Terminos
                </Link>
                <Link className="hover:text-primary transition-all whitespace-nowrap" href="/cookies">
                  Cookies
                </Link>
                <span className="opacity-40 whitespace-nowrap">© 2026 AURA GASTRONOMY</span>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
