import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Only variables prefixed with VITE_ in frontend/.env are exposed to the browser.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      port: Number(env.VITE_DEV_PORT) || 3000,
      // Same-origin API proxy so LAN clients use this host instead of their own localhost.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: Number(env.VITE_DEV_PORT) || 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
    },
  };
});
