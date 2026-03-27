'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';

import { propagateSession, supabase } from '@/lib/supabase';

type Plan = 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';

interface AuthState {
  user: User | null;
  session: Session | null;
  plan: Plan;
  role: string;
  loading: boolean;
  isPro: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (
    email: string,
    pass: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  plan: 'FREE',
  role: 'USER',
  loading: true,
  isPro: false,
  isPremium: false,
  isAdmin: false,
  signIn: async () => {},
  signUp: async () => ({ emailConfirmationRequired: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan>('FREE');
  const [role, setRole] = useState<string>('USER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase().auth.getSession();

        if (mounted) {
          await applySession(currentSession);
        }
      } catch (err) {
        console.error('[Auth] Initial session error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      void applySession(nextSession).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function applySession(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    propagateSession(nextSession?.access_token ?? null);

    if (nextSession?.access_token) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${nextSession.access_token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const profile = await res.json();
        if (profile && !profile.error) {
          setPlan((profile.plan as Plan) ?? 'FREE');
          setRole(profile.role ?? 'USER');
          return;
        }
      } catch (err) {
        console.error('[Auth] Error fetching profile via API:', err);
      }
    }

    setPlan('FREE');
    setRole('USER');
  }

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (data.session) await applySession(data.session);
  };

  const signUp = async (email: string, pass: string, metadata: Record<string, unknown> = {}) => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const { data, error } = await supabase().auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: `${siteUrl}/login?verified=1`,
        data: { ...metadata, role: 'USER', plan: 'FREE' },
      },
    });

    if (error) throw error;
    if (data.session) await applySession(data.session);
    return { emailConfirmationRequired: !data.session };
  };

  const signOut = async () => {
    await supabase().auth.signOut();
    setUser(null);
    setSession(null);
    setPlan('FREE');
    setRole('USER');
    propagateSession(null);
    window.location.href = '/';
  };

  const isPro = plan !== 'FREE';
  const isPremium = plan === 'PREMIUM' || plan === 'ENTERPRISE';
  const isAdmin = role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{ user, session, plan, role, loading, isPro, isPremium, isAdmin, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
