// App providers: TanStack Query, PrimeReact (styled preset), Router.
// i18n is initialized as a side effect of importing ../i18n.
import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { PrimeReactProvider } from '@primereact/core';
import { pvpPreset } from '../theme/preset.js';
import { router } from './router.js';
import '../i18n/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export function AppProviders() {
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
