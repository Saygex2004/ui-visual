// TanStack Router — typed routes. Phase 0 wires two placeholder routes
// (`/` and `/login`); the full routing map (FRONTEND.md §2) lands from Phase 3.
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { Landing } from '../routes/Landing.js';
import { Login } from '../routes/Login.js';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
