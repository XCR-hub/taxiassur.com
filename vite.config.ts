import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path'
import fs from 'fs'

const skipBrokenPublicFiles = () => ({
  name: 'skip-broken-public-files',
  buildStart() {
    const orig = (fs as any).copyFileSync;
    (fs as any).copyFileSync = function(src: string, dest: string, ...rest: any[]) {
      try {
        orig.call(this, src, dest, ...rest);
      } catch (e: any) {
        if (e.code === 'EAGAIN' || e.code === 'EACCES') {
          return;
        }
        throw e;
      }
    };
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [
    skipBrokenPublicFiles(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
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
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [
          /^\/backoffice(?:\/|$)/,
          /^\/admin(?:\/|$)/,
          /^\/auth(?:\/|$)/,
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/postgres-read-api\.taxiassur\.com\/.*/i,
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
      "@": path.resolve(import.meta.dirname, "./src"),
    }
  },
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: ['es2020', 'chrome80', 'safari14'],
    chunkSizeWarningLimit: 500,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      external: ['@sentry/react'],
      output: {
        manualChunks(id) {
          // Keep React in vendor and split only leaf vendor packages to avoid vendor-to-vendor cycles.
          if (id.includes('node_modules')) {
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router') || id.includes('@remix-run/router')) {
              return 'vendor-router';
            }
            return 'vendor';
          }

          // Core lib split: separate heavy libs from lightweight ones
          if (id.includes('/lib/')) {
            // Heavy/rarely-used libs in separate chunk
            if (
              id.includes('pdf-generator') ||
              id.includes('export-utils') ||
              id.includes('sitemap-generator') ||
              id.includes('robots-generator') ||
              id.includes('session-recording') ||
              id.includes('bundle-analyzer') ||
              id.includes('newsAggregator') ||
              id.includes('aiSynthesizer') ||
              id.includes('trendAnalyzer') ||
              id.includes('crm-') ||
              id.includes('email-') ||
              id.includes('payment-') ||
              id.includes('referral') ||
              id.includes('outreach') ||
              id.includes('web-push') ||
              id.includes('keyyo') ||
              id.includes('backlinks') ||
              id.includes('gsc-')
            ) {
              return 'lib-heavy';
            }
            // Keep lightweight project libraries together; the previous lib-supabase split created Rollup cycles.
            return 'lib-core';
          }

          // Charts before backoffice to prevent circular dependencies
          if (id.includes('/components/charts/')) {
            return 'charts';
          }

          // CRM sub-components (loaded inside CRM pages)
          if (id.includes('/components/crm/')) {
            return 'crm-components';
          }

          // Backoffice chunks - order matters to prevent circular deps
          if (id.includes('/backoffice/')) {
            const backofficeFeature = id
              .split('/')
              .pop()
              ?.replace(/\.[^.]+$/, '')
              .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .toLowerCase();
            // Keep the large CRM surface split by feature so every Cloudflare asset
            // remains below the enforced 500 KiB deployment limit.
            if (/Lead|Duplicate|MergeLeads|ManualLead|LostLead/.test(id)) {
              return 'backoffice-crm-leads';
            }
            if (/Pipeline|Kanban|CRMCommercial|CRMProduction|CRMRetention/.test(id)) {
              return 'backoffice-crm-workflows';
            }
            if (/CRMAdmin|CRMInbox|CRMTemplates/.test(id)) {
              return 'backoffice-crm-operations';
            }
            if (id.includes('CRM')) {
              return 'backoffice-crm-core';
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
            if (id.includes('Analytics') || (id.includes('Dashboard') && !id.includes('Master'))) {
              return 'backoffice-analytics';
            }
            // Documents, Quotes, Insurance, Claims
            if (id.includes('Document') || id.includes('Quote') || id.includes('Insurance') || id.includes('Claims') || id.includes('Invoice') || id.includes('Invoicing')) {
              return 'backoffice-documents';
            }
            // GSC, GA4, LLM
            if (id.includes('GSC') || id.includes('GA4') || id.includes('LLM') || id.includes('Ultron') || id.includes('Trend')) {
              return 'backoffice-ai';
            }
            // Keep remaining route screens independent. Grouping them into one
            // administration chunk makes Rolldown merge their shared graph into
            // an asset above Cloudflare Pages' 500 KiB limit.
            return backofficeFeature ? `backoffice-${backofficeFeature}` : 'backoffice-core';
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
    assetsInlineLimit: 10240,
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'],
        pure_getters: true,
        unsafe: false,
        unsafe_comps: false,
        unsafe_math: true,
        unsafe_methods: false,
        arguments: true,
        reduce_vars: true,
        reduce_funcs: true,
        keep_fargs: false,
        keep_infinity: true,
        dead_code: true,
        unused: true,
        collapse_vars: true,
        inline: 2
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
