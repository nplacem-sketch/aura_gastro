'use client';

import AppIcon from '@/components/AppIcon';

export default function LockedContentOverlay({
  tier,
  title = 'Contenido bloqueado',
  description,
}: {
  tier: string;
  title?: string;
  description: string;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(228,255,120,0.18),transparent_42%),radial-gradient(circle_at_bottom,rgba(228,255,120,0.08),transparent_36%)]" />
      <div className="absolute inset-0 border border-[#e4ff78]/35 shadow-[inset_0_0_36px_rgba(228,255,120,0.12),0_0_32px_rgba(228,255,120,0.12)]" />
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#e4ff78]/60 bg-[#e4ff78]/10 shadow-[0_0_28px_rgba(228,255,120,0.32)]">
        <AppIcon name="lock" size={28} className="text-[#f4ffbf]" />
      </div>
      <p className="relative mb-2 font-label text-[10px] uppercase tracking-[0.35em] text-[#f4ffbf]">Plan {tier}</p>
      <p className="relative mb-2 text-sm font-medium text-on-surface">{title}</p>
      <p className="relative max-w-xs text-[11px] leading-5 text-on-surface-variant">{description}</p>
    </div>
  );
}
