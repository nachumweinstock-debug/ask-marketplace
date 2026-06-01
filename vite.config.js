import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'react';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/@vercel/analytics/')) return 'analytics';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': proxyTarget,
      '/uploads': proxyTarget,
    },
  },
});
