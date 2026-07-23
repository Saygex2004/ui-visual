import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_API_BASE (CONFIGURATION.md §4) defaults to /api; in dev we proxy it to
// the local Fastify server so the SPA never talks to Firestore directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
