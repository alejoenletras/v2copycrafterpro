import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  role: 'admin' | 'user';
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data } = await supabase
        .from('user_profiles' as any)
        .select('*')
        .eq('id', userId)
        .single();
      const p = (data as any) ?? null;
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Hard safety: max 4 seconds loading
    const hardTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const done = () => {
      if (mounted) {
        setLoading(false);
        clearTimeout(hardTimeout);
      }
    };

    // Race: profile fetch with 3s timeout
    const fetchWithTimeout = async (userId: string) => {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const fetch = fetchProfile(userId);
      await Promise.race([fetch, timeout]);
    };

    // getSession() refreshes the token if expired — only mark loading
    // done here so that ProtectedRoute waits for a valid token.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchWithTimeout(session.user.id);
      }
      done();
    }).catch(() => done());

    // Listen for future auth changes (sign-in, sign-out, token refresh).
    // Do NOT call done() here — initial load is handled by getSession above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }

        // After a token refresh, invalidate all React Query caches so they
        // re-fetch with the fresh token instead of staying in an error state.
        if (event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries();
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        isApproved: profile?.status === 'approved',
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
