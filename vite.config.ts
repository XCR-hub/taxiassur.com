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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('router')) {
              return 'vendor-router';
            }
            if (id.includes('lucide')) {
              return 'vendor-icons';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }

          if (id.includes('/backoffice/')) {
            if (id.includes('CRM') || id.includes('Lead') || id.includes('Pipeline')) {
              return 'backoffice-crm';
            }
            if (id.includes('AI') || id.includes('Master') || id.includes('Autonomous')) {
              return 'backoffice-ai';
            }
            if (id.includes('Backlink') || id.includes('SEO') || id.includes('Content')) {
              return 'backoffice-seo';
            }
            if (id.includes('Social') || id.includes('WhatsApp') || id.includes('Campaign')) {
              return 'backoffice-marketing';
            }
            return 'backoffice-core';
          }

          if (id.includes('/lib/supabase') || id.includes('/lib/auth')) {
            return 'lib-core';
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
        passes: 2,
        pure_funcs: ['console.log']
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