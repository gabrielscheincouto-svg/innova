import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/premios/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@innova/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@innova/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@innova/supabase': path.resolve(__dirname, '../../packages/supabase/src'),
    },
  },
  server: { port: 5175, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
