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
import { AREA_SLUGS, type AreaSlug, type MeResponse } from '@pvp/shared';
import { ComingSoon } from '../routes/ComingSoon.js';
import { LoginScreen } from '../features/auth/LoginScreen.js';
import { AccountsScreen } from '../features/admin/AccountsScreen.js';
import { CategoriesScreen } from '../features/admin/CategoriesScreen.js';
import { AdminActivityScreen } from '../features/admin/AdminActivityScreen.js';
import { LandingScreen } from '../features/dashboard/LandingScreen.js';
import { AreaView } from '../features/dashboard/AreaView.js';
import { WorkspacePlaceholder } from '../features/dashboard/WorkspacePlaceholder.js';
import { areaSearchSchema, listingSearchSchema } from '../features/dashboard/urlState.js';
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
  component: LandingScreen,
});

const areaRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/aste/$area',
  validateSearch: areaSearchSchema,
  beforeLoad: ({ params }) => {
    // Not a search param (FRONTEND.md §2's "fall back silently" rule) — an
    // unrecognized area segment isn't a valid page at all, so it redirects
    // rather than degrading in place.
    if (!AREA_SLUGS.includes(params.area as AreaSlug)) {
      throw redirect({ to: '/' });
    }
  },
  component: AreaView,
});

const listingRoute = createRoute({
  getParentRoute: () => areaRoute,
  path: '/lotto/$id',
  validateSearch: listingSearchSchema,
  component: WorkspacePlaceholder,
});

// The parent's beforeLoad already populated the cache — this is a
// synchronous read. Server-side role enforcement is the real control
// (SPECIFICATIONS.md §7); this only avoids rendering the screen client-side.
// Shared by every /admin/* route so the check lives in exactly one place.
function requireAdmin({ context }: { context: RouterContext }) {
  const me = context.queryClient.getQueryData<MeResponse>(meQueryKey);
  if (me?.user.role !== 'admin') {
    throw redirect({ to: '/' });
  }
}

const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin',
  beforeLoad: requireAdmin,
  component: AccountsScreen,
});

const adminCategoriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/categorie',
  beforeLoad: requireAdmin,
  component: CategoriesScreen,
});

const adminActivityRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/attivita',
  beforeLoad: requireAdmin,
  component: AdminActivityScreen,
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
  protectedRoute.addChildren([
    indexRoute,
    areaRoute.addChildren([listingRoute]),
    adminRoute,
    adminCategoriesRoute,
    adminActivityRoute,
    calendarRoute,
    chatRoute,
  ]),
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
