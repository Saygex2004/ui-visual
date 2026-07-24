// App providers: TanStack Query, PrimeReact (styled preset), Router. The
// router needs the query client in its context (the auth guard reads/primes
// the `me` query from beforeLoad), so both are constructed together.
// i18n is initialized as a side effect of importing ../i18n.
import { StrictMode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { PrimeReactProvider } from '@primereact/core';
import { pvpPreset } from '../theme/preset.js';
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
      <PrimeReactProvider theme={{ preset: pvpPreset }}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </PrimeReactProvider>
    </StrictMode>
  );
}
