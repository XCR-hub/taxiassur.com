// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo.svg", "logo-512x512.svg"],
      manifest: {
        name: "TaxiAssur - Assurance Taxi Professionnelle",
        short_name: "TaxiAssur",
        description: "Courtier sp\xE9cialiste en assurance taxi. Devis gratuit en 2 minutes.",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/logo-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/drohhxrkoequjphvabvq\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    mode === "analyze" && visualizer({
      open: true,
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
    target: ["es2020", "chrome80", "safari14"],
    chunkSizeWarningLimit: 500,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        if (filename.includes("index") || filename.includes("main")) {
          return deps.filter(
            (dep) => dep.includes("vendor-react") || dep.includes("vendor-router") || dep.includes("lib-core")
          );
        }
        return deps.filter(
          (dep) => dep.includes("vendor-react") || dep.includes("vendor-router")
        );
      }
    },
    rollupOptions: {
      external: ["@sentry/react"],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("scheduler")) {
              return "vendor-react";
            }
            if (id.includes("router")) {
              return "vendor-router";
            }
            if (id.includes("lucide")) {
              return "vendor-icons";
            }
            if (id.includes("supabase")) {
              return "vendor-supabase";
            }
            return "vendor";
          }
          if (id.includes("/lib/")) {
            if (id.includes("pdf-generator") || id.includes("export-utils") || id.includes("sitemap-generator") || id.includes("robots-generator") || id.includes("session-recording") || id.includes("bundle-analyzer") || id.includes("newsAggregator") || id.includes("aiSynthesizer") || id.includes("trendAnalyzer") || id.includes("crm-") || id.includes("email-") || id.includes("payment-") || id.includes("referral") || id.includes("outreach") || id.includes("web-push") || id.includes("keyyo") || id.includes("backlinks") || id.includes("gsc-")) {
              return "lib-heavy";
            }
            if (id.includes("leads") || id.includes("auth") || id.includes("supabase-instance") || id.includes("commercial-workflow") || id.includes("crm-pipeline")) {
              return "lib-supabase";
            }
            return "lib-core";
          }
          if (id.includes("/components/charts/")) {
            return "charts";
          }
          if (id.includes("/backoffice/")) {
            if (id.includes("CRM") || id.includes("Lead") || id.includes("Pipeline")) {
              return "backoffice-crm";
            }
            if (id.includes("AI") || id.includes("Master") || id.includes("Autonomous")) {
              return "backoffice-ai";
            }
            if (id.includes("Social") || id.includes("WhatsApp") || id.includes("Campaign") || id.includes("Email")) {
              return "backoffice-marketing";
            }
            if (id.includes("Backlink") || id.includes("SEO") || id.includes("Content")) {
              return "backoffice-seo";
            }
            if (id.includes("Analytics") || id.includes("Dashboard") && !id.includes("Master")) {
              return "backoffice-analytics";
            }
            return "backoffice-core";
          }
          if (id.includes("/components/client/") || id.includes("/pages/client/")) {
            return "client-portal";
          }
          if (id.includes("/pages/AssuranceTaxi") && !id.match(/AssuranceTaxi\.(tsx|js)$/)) {
            return "pages-cities";
          }
          if (id.includes("/pages/")) {
            const match = id.match(/pages\/([^/]+)/);
            if (match) return `page-${match[1].toLowerCase().replace(".tsx", "")}`;
          }
        },
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js"
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
        pure_funcs: ["console.log", "console.info", "console.debug", "console.warn", "console.error"],
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
    host: true
  },
  publicDir: "public",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production")
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnbG9nby5zdmcnLCAnbG9nby01MTJ4NTEyLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1RheGlBc3N1ciAtIEFzc3VyYW5jZSBUYXhpIFByb2Zlc3Npb25uZWxsZScsXG4gICAgICAgIHNob3J0X25hbWU6ICdUYXhpQXNzdXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvdXJ0aWVyIHNwXHUwMEU5Y2lhbGlzdGUgZW4gYXNzdXJhbmNlIHRheGkuIERldmlzIGdyYXR1aXQgZW4gMiBtaW51dGVzLicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzAwMDAwMCcsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLTUxMng1MTIuc3ZnJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLGpwZyxqcGVnLHdlYnB9J10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9kcm9oaHhya29lcXVqcGh2YWJ2cVxcLnN1cGFiYXNlXFwuY29cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N1cGFiYXNlLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgbW9kZSA9PT0gJ2FuYWx5emUnICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfVxuICB9LFxuICBiYXNlOiAnLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGFyZ2V0OiBbJ2VzMjAyMCcsICdjaHJvbWU4MCcsICdzYWZhcmkxNCddLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLFxuICAgIG1vZHVsZVByZWxvYWQ6IHtcbiAgICAgIHBvbHlmaWxsOiBmYWxzZSxcbiAgICAgIHJlc29sdmVEZXBlbmRlbmNpZXM6IChmaWxlbmFtZSwgZGVwcykgPT4ge1xuICAgICAgICAvLyBGb3IgdGhlIG1haW4gZW50cnksIG9ubHkgcHJlbG9hZCB0aGUgbWluaW1hbCBjcml0aWNhbCBjaGFpblxuICAgICAgICBpZiAoZmlsZW5hbWUuaW5jbHVkZXMoJ2luZGV4JykgfHwgZmlsZW5hbWUuaW5jbHVkZXMoJ21haW4nKSkge1xuICAgICAgICAgIHJldHVybiBkZXBzLmZpbHRlcihkZXAgPT5cbiAgICAgICAgICAgIGRlcC5pbmNsdWRlcygndmVuZG9yLXJlYWN0JykgfHxcbiAgICAgICAgICAgIGRlcC5pbmNsdWRlcygndmVuZG9yLXJvdXRlcicpIHx8XG4gICAgICAgICAgICBkZXAuaW5jbHVkZXMoJ2xpYi1jb3JlJylcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBwYWdlIGNodW5rcywgcHJlbG9hZCByZWFjdCArIHJvdXRlciBvbmx5IChzdXBhYmFzZSBkZWZlcnJlZClcbiAgICAgICAgcmV0dXJuIGRlcHMuZmlsdGVyKGRlcCA9PlxuICAgICAgICAgIGRlcC5pbmNsdWRlcygndmVuZG9yLXJlYWN0JykgfHxcbiAgICAgICAgICBkZXAuaW5jbHVkZXMoJ3ZlbmRvci1yb3V0ZXInKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsnQHNlbnRyeS9yZWFjdCddLFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIC8vIFZlbmRvciBjaHVua3MgZmlyc3QgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jaWVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdCcpIHx8IGlkLmluY2x1ZGVzKCdzY2hlZHVsZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JvdXRlcicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJvdXRlcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWljb25zJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3VwYWJhc2UnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1zdXBhYmFzZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ29yZSBsaWIgc3BsaXQ6IHNlcGFyYXRlIGhlYXZ5IGxpYnMgZnJvbSBsaWdodHdlaWdodCBvbmVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvbGliLycpKSB7XG4gICAgICAgICAgICAvLyBIZWF2eS9yYXJlbHktdXNlZCBsaWJzIGluIHNlcGFyYXRlIGNodW5rXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdwZGYtZ2VuZXJhdG9yJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2V4cG9ydC11dGlscycpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdzaXRlbWFwLWdlbmVyYXRvcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdyb2JvdHMtZ2VuZXJhdG9yJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3Nlc3Npb24tcmVjb3JkaW5nJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2J1bmRsZS1hbmFseXplcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCduZXdzQWdncmVnYXRvcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdhaVN5bnRoZXNpemVyJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3RyZW5kQW5hbHl6ZXInKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY3JtLScpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdlbWFpbC0nKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncGF5bWVudC0nKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncmVmZXJyYWwnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnb3V0cmVhY2gnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnd2ViLXB1c2gnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygna2V5eW8nKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnYmFja2xpbmtzJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2dzYy0nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnbGliLWhlYXZ5JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN1cGFiYXNlLWRlcGVuZGVudCBsaWJzOiBzZXBhcmF0ZSB0byBhdm9pZCBsb2FkaW5nIHN1cGFiYXNlIG9uIHB1YmxpYyBwYWdlc1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnbGVhZHMnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnYXV0aCcpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdzdXBhYmFzZS1pbnN0YW5jZScpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdjb21tZXJjaWFsLXdvcmtmbG93JykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2NybS1waXBlbGluZScpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdsaWItc3VwYWJhc2UnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdsaWItY29yZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ2hhcnRzIGJlZm9yZSBiYWNrb2ZmaWNlIHRvIHByZXZlbnQgY2lyY3VsYXIgZGVwZW5kZW5jaWVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvY29tcG9uZW50cy9jaGFydHMvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnY2hhcnRzJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBCYWNrb2ZmaWNlIGNodW5rcyAtIG9yZGVyIG1hdHRlcnMgdG8gcHJldmVudCBjaXJjdWxhciBkZXBzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvYmFja29mZmljZS8nKSkge1xuICAgICAgICAgICAgLy8gQ1JNIGZpcnN0IGFzIGl0J3MgbW9zdCB1c2VkXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0NSTScpIHx8IGlkLmluY2x1ZGVzKCdMZWFkJykgfHwgaWQuaW5jbHVkZXMoJ1BpcGVsaW5lJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNybSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBSSBhZnRlciBDUk1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQUknKSB8fCBpZC5pbmNsdWRlcygnTWFzdGVyJykgfHwgaWQuaW5jbHVkZXMoJ0F1dG9ub21vdXMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtYWknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFya2V0aW5nXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ1NvY2lhbCcpIHx8IGlkLmluY2x1ZGVzKCdXaGF0c0FwcCcpIHx8IGlkLmluY2x1ZGVzKCdDYW1wYWlnbicpIHx8IGlkLmluY2x1ZGVzKCdFbWFpbCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYmFja29mZmljZS1tYXJrZXRpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU0VPXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0JhY2tsaW5rJykgfHwgaWQuaW5jbHVkZXMoJ1NFTycpIHx8IGlkLmluY2x1ZGVzKCdDb250ZW50JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLXNlbyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbmFseXRpY3NcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQW5hbHl0aWNzJykgfHwgKGlkLmluY2x1ZGVzKCdEYXNoYm9hcmQnKSAmJiAhaWQuaW5jbHVkZXMoJ01hc3RlcicpKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtYW5hbHl0aWNzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENvcmUgbGFzdCBhcyBmYWxsYmFja1xuICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENsaWVudCBwb3J0YWxcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzL2NsaWVudC8nKSB8fCBpZC5pbmNsdWRlcygnL3BhZ2VzL2NsaWVudC8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjbGllbnQtcG9ydGFsJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBHcm91cCBhbGwgY2l0eS1zcGVjaWZpYyBhc3N1cmFuY2UgcGFnZXMgdG9nZXRoZXJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9wYWdlcy9Bc3N1cmFuY2VUYXhpJykgJiYgIWlkLm1hdGNoKC9Bc3N1cmFuY2VUYXhpXFwuKHRzeHxqcykkLykpIHtcbiAgICAgICAgICAgIHJldHVybiAncGFnZXMtY2l0aWVzJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBQYWdlcyBzcGxpdCBieSByb3V0ZVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3BhZ2VzLycpKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGlkLm1hdGNoKC9wYWdlc1xcLyhbXi9dKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkgcmV0dXJuIGBwYWdlLSR7bWF0Y2hbMV0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKCcudHN4JywgJycpfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICB9XG4gICAgfSxcbiAgICBjb3B5UHVibGljRGlyOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiAxMDI0MCxcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICBwYXNzZXM6IDIsXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnLCAnY29uc29sZS53YXJuJywgJ2NvbnNvbGUuZXJyb3InXSxcbiAgICAgICAgcHVyZV9nZXR0ZXJzOiB0cnVlLFxuICAgICAgICB1bnNhZmU6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfY29tcHM6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfbWF0aDogdHJ1ZSxcbiAgICAgICAgdW5zYWZlX21ldGhvZHM6IGZhbHNlLFxuICAgICAgICBhcmd1bWVudHM6IHRydWUsXG4gICAgICAgIHJlZHVjZV92YXJzOiB0cnVlLFxuICAgICAgICByZWR1Y2VfZnVuY3M6IHRydWUsXG4gICAgICAgIGtlZXBfZmFyZ3M6IGZhbHNlLFxuICAgICAgICBrZWVwX2luZmluaXR5OiB0cnVlLFxuICAgICAgICBkZWFkX2NvZGU6IHRydWUsXG4gICAgICAgIHVudXNlZDogdHJ1ZSxcbiAgICAgICAgY29sbGFwc2VfdmFyczogdHJ1ZSxcbiAgICAgICAgaW5saW5lOiAyXG4gICAgICB9LFxuICAgICAgbWFuZ2xlOiB7XG4gICAgICAgIHNhZmFyaTEwOiB0cnVlLFxuICAgICAgICB0b3BsZXZlbDogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmb3JtYXQ6IHtcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLFxuICAgICAgICBlY21hOiAyMDIwXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIGhvc3Q6IHRydWUsXG4gIH0sXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdwcm9kdWN0aW9uJylcbiAgfVxufSkpOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSxZQUFZLGtCQUFrQjtBQUFB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
