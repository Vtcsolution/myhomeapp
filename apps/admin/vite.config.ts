import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The dashboard is served under /admin/. In development every other path is
 * proxied to the Expo web server (port 8081), so the customer/professional app
 * and the dashboard share one web origin — and therefore one demo database in
 * localStorage (see `DEMO_STATE_KEY` in @myhome/shared/mock).
 */
const MOBILE_WEB = process.env.MOBILE_WEB_URL ?? 'http://localhost:8081';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '^/(?!admin(/|$)).*': { target: MOBILE_WEB, changeOrigin: true, ws: true },
    },
  },
  preview: { port: 4173, strictPort: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Framework code changes rarely: a separate chunk stays cached across releases.
        // Screens are split per route in App.tsx; the simulated backend loads with the app.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
