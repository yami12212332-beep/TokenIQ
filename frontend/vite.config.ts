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
    },
    preview: {
      port: Number(env.VITE_DEV_PORT) || 3000,
    },
  };
});
