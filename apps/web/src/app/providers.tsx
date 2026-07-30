// App providers: TanStack Query, Router. The router needs the query client
// in its context (the auth guard reads/primes the `me` query from
// beforeLoad), so both are constructed together.
// i18n is initialized as a side effect of importing ../i18n.
import { StrictMode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from './router.js';
import '../i18n/index.js';

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );
  const [router] = useState(() => createAppRouter(queryClient));

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
