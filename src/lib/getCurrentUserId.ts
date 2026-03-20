import { supabase } from '@/lib/supabase';

/**
 * Get the current authenticated user's ID synchronously from the cached session.
 * For use in non-React contexts (Zustand stores, plain functions).
 * Falls back to 'default-user' if no session exists.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? 'default-user';
}
