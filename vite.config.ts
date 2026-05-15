import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide')) return 'vendor-lucide';
              if (id.includes('react')) return 'vendor-react-core';
              return 'vendor-others';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
    },
    server: {
      allowedHosts: true,
    }
  };
});
