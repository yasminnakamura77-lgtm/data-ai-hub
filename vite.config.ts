import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The shared checkout lives at Pilgrims\pilgrims-core-components.
// This project root is three levels below the Pilgrims directory.
import { createPlatformDevAlias } from '../../../pilgrims-core-components/packages/config/dist/vite-preset.js';

process.env.PLATFORM_DEV ||= '1';

const platformDev = createPlatformDevAlias({ appRoot: process.cwd() });

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { ...platformDev.alias, '@': fileURLToPath(new URL('./src', import.meta.url)) }, dedupe: platformDev.dedupe },
  server: {
    port: 5175,
    fs: { allow: platformDev.fsAllow },
    proxy: {
      '/api/catalogue': 'http://127.0.0.1:8000',
      '/api/assistant': 'http://127.0.0.1:8000',
      '/api/query': 'http://127.0.0.1:8000',
      '/api/governance-health': { target: 'http://127.0.0.1:8000', rewrite: () => '/api/health' },
      '/api': 'http://127.0.0.1:8099',
    },
  },
});
