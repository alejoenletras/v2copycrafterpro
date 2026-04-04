import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Never retry auth errors — they won't self-resolve
        const status = error?.status ?? error?.code;
        if (status === 401 || status === 403 || status === '401' || status === '403') return false;
        return failureCount < 2;
      },
    },
  },
});
