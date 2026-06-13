import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  server: {
    host: '0.0.0.0', // Tillåt anslutningar från alla IP:er
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? 'http://voice-assistant-service-backend.voice-assistant.svc.cluster.local:8081'
          : process.env.VITE_API_URL || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Proxying request:', req.method, req.url);
          });
        },
      },
      '/oauth2': {
        target: process.env.VITE_API_URL || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/login/oauth2': {
        target: process.env.VITE_API_URL || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: process.env.VITE_API_URL || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // Optimerad build-konfiguration
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/axios') || id.includes('node_modules/zustand')) {
            return 'utils';
          }
          return undefined;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    // Komprimeringsoptimering
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  // Optimerade dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios'],
    exclude: ['lucide-react'],
  },
});
