import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_API_BASE (CONFIGURATION.md §4) defaults to /api; in dev we proxy it to
// the local Fastify server so the SPA never talks to Firestore directly.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // explicit IPv4 bind — Vite's default can resolve to
    // ::1-only depending on the OS/Node version, which breaks tooling
    // (Playwright's webServer health check) that probes 127.0.0.1 directly.
    port: 5173,
    proxy: {
      // The server mounts every route under /api itself (app.ts registers
      // auth/admin/listings inside an `{ prefix: '/api' }` context) — mirroring
      // production, where Firebase Hosting rewrites /api/** to Cloud Run
      // WITHOUT stripping the prefix. No path rewrite here for the same reason.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
