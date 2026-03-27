'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';

import PlansPopup from '@/components/PlansPopup';
import { canAccessTier } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';

export default function TierGateAction({
  href,
  requiredTier,
  className,
  children,
}: {
  href: string;
  requiredTier: string;
  className?: string;
  children: ReactNode;
}) {
  const { plan, role } = useAuth();
  const [open, setOpen] = useState(false);
  const allowed = canAccessTier(plan, requiredTier, role);

  return (
    <>
      {allowed ? (
        <Link href={href} className={className}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={className}>
          {children}
        </button>
      )}
      <PlansPopup open={open} onClose={() => setOpen(false)} requiredTier={requiredTier} />
    </>
  );
}
