import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://yicngusesbhskxcbdpjw.supabase.co'
    ),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpY25ndXNlc2Joc2t4Y2JkcGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODQ0MDMsImV4cCI6MjEwNjc2MDQwM30.AsOqjNkeGk-HzGYFY7G9Nl8a6u8RxVrd1nEdc6k0wJE'
    ),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'recharts']
        }
      }
    }
  }
});
