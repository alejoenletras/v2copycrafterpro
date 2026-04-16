import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the set of user_ids the current session should READ from in
 * user-scoped tables (dnas, chat_conversations, vsl_projects, survey_analyses, …).
 *
 * - Admins share a pool: every admin sees every other admin's data
 *   (Hooq "brand team" semantics).
 * - Regular users see only their own data.
 * - Writes still use the current user's id (see `useUserId`).
 *
 * Returns `null` while the session is still loading so callers can gate
 * React Query's `enabled` flag and avoid firing with a partial scope.
 */
export function useDataScope(): string[] | null {
  const { user, scopeIds, loading } = useAuth();
  if (loading) return null;
  if (!user) return null;
  return scopeIds;
}
