import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173, host: true },
  build: {
    // Target modern browsers — smaller bundles, faster parsing
    target: 'es2022',
    // Source maps for production debugging (uploaded to Cloudflare, not public)
    sourcemap: 'hidden',
    // Increase chunk warning to 300kB (vendor chunks are large but cached)
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-clerk': ['@clerk/clerk-react'],
        },
      },
    },
  },
  // Environment variable validation — fail build if missing
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
