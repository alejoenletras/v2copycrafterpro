import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the current authenticated user's ID, or null while the session is loading.
 * Use the return value with React Query's `enabled` option to prevent queries with a fake ID.
 */
export function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
