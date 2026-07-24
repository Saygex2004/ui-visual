// TanStack Router — typed routes (FRONTEND.md §2). Phase 3 adds the auth
// guard: `/login` is the only public route; everything else lives under a
// pathless `protectedRoute` layout whose `beforeLoad` ensures a session
// (redirecting to `/login?redirect=<here>` otherwise) and whose component
// (ProtectedLayout) renders the forced-password-change screen or the app
// shell. `/admin` additionally requires the admin role.
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useSearch,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { MeResponse } from '@pvp/shared';
import { Landing } from '../routes/Landing.js';
import { ComingSoon } from '../routes/ComingSoon.js';
import { LoginScreen } from '../features/auth/LoginScreen.js';
import { AccountsScreen } from '../features/admin/AccountsScreen.js';
import { ProtectedLayout } from './ProtectedLayout.js';
import { meQueryKey } from '../features/auth/hooks.js';
import { fetchMe } from '../features/auth/api.js';
import { ApiError } from '../lib/apiClient.js';

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const loginSearchSchema = z.object({ redirect: z.string().optional() });

function LoginRouteComponent() {
  const { redirect: redirectTo } = useSearch({ strict: false }) as { redirect?: string };
  return <LoginScreen redirectTo={redirectTo} />;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, search }) => {
    let me = context.queryClient.getQueryData<MeResponse>(meQueryKey);
    if (me === undefined) {
      try {
        me = await context.queryClient.fetchQuery({ queryKey: meQueryKey, queryFn: fetchMe });
      } catch {
        me = undefined; // not authenticated — show the login form
      }
    }
    if (me) {
      const target = search.redirect?.startsWith('/') ? search.redirect : '/';
      throw redirect({ to: target });
    }
  },
  component: LoginRouteComponent,
});

const protectedRoute = createRoute({
  id: 'protected-layout',
  getParentRoute: () => rootRoute,
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData({ queryKey: meQueryKey, queryFn: fetchMe });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: '/login', search: { redirect: location.href } });
      }
      throw err;
    }
  },
  component: ProtectedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: Landing,
});

const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin',
  beforeLoad: ({ context }) => {
    // The parent's beforeLoad already populated the cache — this is a
    // synchronous read. Server-side role enforcement is the real control
    // (SPECIFICATIONS.md §7); this only avoids rendering the screen client-side.
    const me = context.queryClient.getQueryData<MeResponse>(meQueryKey);
    if (me?.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: AccountsScreen,
});

const calendarRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/calendario',
  component: ComingSoon,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/chat',
  component: ComingSoon,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([indexRoute, adminRoute, calendarRoute, chatRoute]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient } });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
