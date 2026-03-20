import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the current authenticated user's ID.
 * Falls back to 'default-user' if not authenticated (should not happen in protected routes).
 */
export function useUserId(): string {
  const { user } = useAuth();
  return user?.id ?? 'default-user';
}
