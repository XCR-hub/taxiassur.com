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
            // Séparer TOUS les composants backoffice individuellement pour éviter les dépendances circulaires
            if (id.includes('MasterDashboard')) return 'backoffice-masterdashboard';
            if (id.includes('MasterAI')) return 'backoffice-masterai';
            if (id.includes('NewsManager')) return 'backoffice-newsmanager';
            if (id.includes('SocialMediaManager')) return 'backoffice-socialmedia';
            if (id.includes('LeadManager')) return 'backoffice-leadmanager';
            if (id.includes('LeadCRM')) return 'backoffice-leadcrm';
            if (id.includes('LeadMarketplace')) return 'backoffice-leadmarketplace';
            if (id.includes('AIContentGenerator')) return 'backoffice-aicontentgen';
            if (id.includes('AutoOptimizer')) return 'backoffice-autooptimizer';
            if (id.includes('BacklinkManager')) return 'backoffice-backlinkmanager';
            if (id.includes('BacklinkProspector')) return 'backoffice-backlinkprospector';
            if (id.includes('Dashboard')) return 'backoffice-dashboard';
            if (id.includes('CityPageGenerator')) return 'backoffice-citypagegen';
            if (id.includes('TrendAnalyzer')) return 'backoffice-trendanalyzer';
            // Autres composants backoffice dans un chunk séparé
            return 'backoffice-other';
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
        drop_console: false,
        drop_debugger: true,
        passes: 1
      },
      mangle: false,
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