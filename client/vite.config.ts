import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are forwarded to the Express server, so the browser
// sees one origin (needed for the login cookie, and it works from your phone too).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
