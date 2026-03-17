import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'logo-512x512.svg'],
      manifest: {
        name: 'TaxiAssur - Assurance Taxi Professionnelle',
        short_name: 'TaxiAssur',
        description: 'Courtier spécialiste en assurance taxi. Devis gratuit en 2 minutes.',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/drohhxrkoequjphvabvq\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
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
    target: 'es2020',
    chunkSizeWarningLimit: 500,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        if (filename.includes('index')) {
          return deps.filter(dep =>
            dep.includes('vendor-react') ||
            dep.includes('vendor-router') ||
            dep.includes('lib-core')
          );
        }
        return [];
      }
    },
    rollupOptions: {
      external: ['@sentry/react'],
      output: {
        manualChunks(id) {
          // Vendor chunks first to avoid circular dependencies
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

          // Core lib before backoffice to prevent circular dependencies
          if (id.includes('/lib/')) {
            return 'lib-core';
          }

          // Charts before backoffice to prevent circular dependencies
          if (id.includes('/components/charts/')) {
            return 'charts';
          }

          // Backoffice chunks - order matters to prevent circular deps
          if (id.includes('/backoffice/')) {
            // CRM first as it's most used
            if (id.includes('CRM') || id.includes('Lead') || id.includes('Pipeline')) {
              return 'backoffice-crm';
            }
            // AI after CRM
            if (id.includes('AI') || id.includes('Master') || id.includes('Autonomous')) {
              return 'backoffice-ai';
            }
            // Marketing
            if (id.includes('Social') || id.includes('WhatsApp') || id.includes('Campaign') || id.includes('Email')) {
              return 'backoffice-marketing';
            }
            // SEO
            if (id.includes('Backlink') || id.includes('SEO') || id.includes('Content')) {
              return 'backoffice-seo';
            }
            // Analytics
            if (id.includes('Analytics') || id.includes('Dashboard') && !id.includes('Master')) {
              return 'backoffice-analytics';
            }
            // Core last as fallback
            return 'backoffice-core';
          }

          // Client portal
          if (id.includes('/components/client/') || id.includes('/pages/client/')) {
            return 'client-portal';
          }

          // Group all city-specific assurance pages together
          if (id.includes('/pages/AssuranceTaxi') && !id.match(/AssuranceTaxi\.(tsx|js)$/)) {
            return 'pages-cities';
          }

          // Pages split by route
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
    assetsInlineLimit: 8192,
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        pure_getters: false,
        unsafe: false,
        unsafe_comps: false,
        unsafe_math: true,
        unsafe_methods: false,
        arguments: false,
        reduce_vars: true,
        reduce_funcs: true,
        keep_fargs: false,
        keep_infinity: true
      },
      mangle: {
        safari10: true,
        toplevel: false
      },
      format: {
        comments: false,
        ecma: 2020
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
}));