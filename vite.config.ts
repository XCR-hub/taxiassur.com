import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('router')) {
              return 'vendor-router';
            }
            if (id.includes('lucide')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
          if (id.includes('/backoffice/')) {
            // Séparer les composants backoffice pour éviter dépendances circulaires
            if (id.includes('MasterDashboard') || id.includes('MasterAI')) {
              return 'backoffice-master';
            }
            if (id.includes('NewsManager') || id.includes('SocialMediaManager')) {
              return 'backoffice-content';
            }
            if (id.includes('LeadManager') || id.includes('LeadCRM') || id.includes('LeadMarketplace')) {
              return 'backoffice-leads';
            }
            if (id.includes('AIContentGenerator') || id.includes('AutoOptimizer')) {
              return 'backoffice-ai';
            }
            if (id.includes('BacklinkManager') || id.includes('BacklinkProspector')) {
              return 'backoffice-seo';
            }
            // Autres composants backoffice
            return 'backoffice-tools';
          }
          if (id.includes('/pages/')) {
            const match = id.match(/pages\/([^/]+)/);
            if (match) return `page-${match[1].toLowerCase().replace('.tsx', '')}`;
          }
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    copyPublicDir: true,
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 1
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    }
  },
  server: {
    port: 5173,
    host: true,
  },
  publicDir: 'public',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});