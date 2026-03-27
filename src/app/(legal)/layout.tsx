import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1c1b] font-body selection:bg-secondary/40">
      <nav className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-headline text-2xl tracking-tight hover:opacity-70 transition-opacity">AURA <span className="italic font-light">Gastronomy</span></Link>
          <Link href="/" className="text-[10px] font-label uppercase tracking-widest border border-black/10 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">Volver al Panel</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-20 animate-slide-up prose prose-neutral prose-headings:font-headline prose-headings:font-normal prose-p:font-light prose-p:leading-relaxed prose-a:text-secondary">
        {children}
      </main>
      <footer className="border-t border-black/5 bg-[#f5f5f5] py-12">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="flex gap-8 text-[10px] font-label uppercase tracking-widest text-black/40">
            <Link href="/privacy-policy" className="hover:text-black transition-all">Privacidad</Link>
            <Link href="/terms" className="hover:text-black transition-all">Términos</Link>
            <Link href="/cookies" className="hover:text-black transition-all">Cookies</Link>
            <Link href="/legal-notice" className="hover:text-black transition-all">Aviso Legal</Link>
          </div>
          <p className="text-[9px] font-label uppercase tracking-[0.3em] text-black/20">© 2026 AURA GASTRONOMY - Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
