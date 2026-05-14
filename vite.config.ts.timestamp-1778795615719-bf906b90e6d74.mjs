// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import path from "path";
import fs from "fs";
var __vite_injected_original_dirname = "/home/project";
var skipBrokenPublicFiles = () => ({
  name: "skip-broken-public-files",
  buildStart() {
    const orig = fs.copyFileSync;
    fs.copyFileSync = function(src, dest, ...rest) {
      try {
        orig.call(this, src, dest, ...rest);
      } catch (e) {
        if (e.code === "EAGAIN" || e.code === "EACCES") {
          return;
        }
        throw e;
      }
    };
  }
});
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    skipBrokenPublicFiles(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
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
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) => dep.includes("vendor-react")
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
            if (id.includes("leads") || id.includes("auth") || id.includes("supabase-instance") || id.includes("supabase.ts") || id.includes("commercial-workflow") || id.includes("crm-pipeline")) {
              return "lib-supabase";
            }
            return "lib-core";
          }
          if (id.includes("/components/charts/")) {
            return "charts";
          }
          if (id.includes("/components/crm/")) {
            return "crm-components";
          }
          if (id.includes("/backoffice/")) {
            if (id.includes("CRM") || id.includes("Lead") || id.includes("Pipeline") || id.includes("Kanban") || id.includes("Duplicate")) {
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
            if (id.includes("Document") || id.includes("Quote") || id.includes("Insurance") || id.includes("Claims") || id.includes("Invoice") || id.includes("Invoicing")) {
              return "backoffice-documents";
            }
            if (id.includes("Automation") || id.includes("Cron") || id.includes("Compliance") || id.includes("Security") || id.includes("User") || id.includes("Notification")) {
              return "backoffice-admin";
            }
            if (id.includes("GSC") || id.includes("GA4") || id.includes("LLM") || id.includes("Ultron") || id.includes("Trend")) {
              return "backoffice-ai";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcydcblxuY29uc3Qgc2tpcEJyb2tlblB1YmxpY0ZpbGVzID0gKCkgPT4gKHtcbiAgbmFtZTogJ3NraXAtYnJva2VuLXB1YmxpYy1maWxlcycsXG4gIGJ1aWxkU3RhcnQoKSB7XG4gICAgY29uc3Qgb3JpZyA9IChmcyBhcyBhbnkpLmNvcHlGaWxlU3luYztcbiAgICAoZnMgYXMgYW55KS5jb3B5RmlsZVN5bmMgPSBmdW5jdGlvbihzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nLCAuLi5yZXN0OiBhbnlbXSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgb3JpZy5jYWxsKHRoaXMsIHNyYywgZGVzdCwgLi4ucmVzdCk7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VBR0FJTicgfHwgZS5jb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcGx1Z2luczogW1xuICAgIHNraXBCcm9rZW5QdWJsaWNGaWxlcygpLFxuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnc2NyaXB0LWRlZmVyJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnbG9nby5zdmcnLCAnbG9nby01MTJ4NTEyLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1RheGlBc3N1ciAtIEFzc3VyYW5jZSBUYXhpIFByb2Zlc3Npb25uZWxsZScsXG4gICAgICAgIHNob3J0X25hbWU6ICdUYXhpQXNzdXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvdXJ0aWVyIHNwXHUwMEU5Y2lhbGlzdGUgZW4gYXNzdXJhbmNlIHRheGkuIERldmlzIGdyYXR1aXQgZW4gMiBtaW51dGVzLicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzAwMDAwMCcsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLTUxMng1MTIuc3ZnJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLGpwZyxqcGVnLHdlYnB9J10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9kcm9oaHhya29lcXVqcGh2YWJ2cVxcLnN1cGFiYXNlXFwuY29cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N1cGFiYXNlLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgbW9kZSA9PT0gJ2FuYWx5emUnICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfVxuICB9LFxuICBiYXNlOiAnLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGFyZ2V0OiBbJ2VzMjAyMCcsICdjaHJvbWU4MCcsICdzYWZhcmkxNCddLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLFxuICAgIG1vZHVsZVByZWxvYWQ6IHtcbiAgICAgIHBvbHlmaWxsOiBmYWxzZSxcbiAgICAgIHJlc29sdmVEZXBlbmRlbmNpZXM6IChfZmlsZW5hbWUsIGRlcHMpID0+IHtcbiAgICAgICAgcmV0dXJuIGRlcHMuZmlsdGVyKGRlcCA9PlxuICAgICAgICAgIGRlcC5pbmNsdWRlcygndmVuZG9yLXJlYWN0JylcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbJ0BzZW50cnkvcmVhY3QnXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzIGZpcnN0IHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY2llc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygnc2NoZWR1bGVyJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcmVhY3QnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyb3V0ZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yb3V0ZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdsdWNpZGUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3N1cGFiYXNlJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itc3VwYWJhc2UnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENvcmUgbGliIHNwbGl0OiBzZXBhcmF0ZSBoZWF2eSBsaWJzIGZyb20gbGlnaHR3ZWlnaHQgb25lc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2xpYi8nKSkge1xuICAgICAgICAgICAgLy8gSGVhdnkvcmFyZWx5LXVzZWQgbGlicyBpbiBzZXBhcmF0ZSBjaHVua1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncGRmLWdlbmVyYXRvcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdleHBvcnQtdXRpbHMnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc2l0ZW1hcC1nZW5lcmF0b3InKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncm9ib3RzLWdlbmVyYXRvcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdzZXNzaW9uLXJlY29yZGluZycpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdidW5kbGUtYW5hbHl6ZXInKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnbmV3c0FnZ3JlZ2F0b3InKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnYWlTeW50aGVzaXplcicpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCd0cmVuZEFuYWx5emVyJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2NybS0nKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnZW1haWwtJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3BheW1lbnQtJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlZmVycmFsJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ291dHJlYWNoJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3dlYi1wdXNoJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2tleXlvJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2JhY2tsaW5rcycpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdnc2MtJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2xpYi1oZWF2eSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTdXBhYmFzZS1kZXBlbmRlbnQgbGliczogc2VwYXJhdGUgdG8gYXZvaWQgbG9hZGluZyBzdXBhYmFzZSBvbiBwdWJsaWMgcGFnZXNcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2xlYWRzJykgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2F1dGgnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc3VwYWJhc2UtaW5zdGFuY2UnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc3VwYWJhc2UudHMnKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY29tbWVyY2lhbC13b3JrZmxvdycpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdjcm0tcGlwZWxpbmUnKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnbGliLXN1cGFiYXNlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnbGliLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENoYXJ0cyBiZWZvcmUgYmFja29mZmljZSB0byBwcmV2ZW50IGNpcmN1bGFyIGRlcGVuZGVuY2llc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2NvbXBvbmVudHMvY2hhcnRzLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NoYXJ0cyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ1JNIHN1Yi1jb21wb25lbnRzIChsb2FkZWQgaW5zaWRlIENSTSBwYWdlcylcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzL2NybS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjcm0tY29tcG9uZW50cyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQmFja29mZmljZSBjaHVua3MgLSBvcmRlciBtYXR0ZXJzIHRvIHByZXZlbnQgY2lyY3VsYXIgZGVwc1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2JhY2tvZmZpY2UvJykpIHtcbiAgICAgICAgICAgIC8vIENSTSBmaXJzdCBhcyBpdCdzIG1vc3QgdXNlZFxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdDUk0nKSB8fCBpZC5pbmNsdWRlcygnTGVhZCcpIHx8IGlkLmluY2x1ZGVzKCdQaXBlbGluZScpIHx8IGlkLmluY2x1ZGVzKCdLYW5iYW4nKSB8fCBpZC5pbmNsdWRlcygnRHVwbGljYXRlJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNybSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBSSBhZnRlciBDUk1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQUknKSB8fCBpZC5pbmNsdWRlcygnTWFzdGVyJykgfHwgaWQuaW5jbHVkZXMoJ0F1dG9ub21vdXMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtYWknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFya2V0aW5nXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ1NvY2lhbCcpIHx8IGlkLmluY2x1ZGVzKCdXaGF0c0FwcCcpIHx8IGlkLmluY2x1ZGVzKCdDYW1wYWlnbicpIHx8IGlkLmluY2x1ZGVzKCdFbWFpbCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYmFja29mZmljZS1tYXJrZXRpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU0VPXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0JhY2tsaW5rJykgfHwgaWQuaW5jbHVkZXMoJ1NFTycpIHx8IGlkLmluY2x1ZGVzKCdDb250ZW50JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLXNlbyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbmFseXRpY3NcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQW5hbHl0aWNzJykgfHwgKGlkLmluY2x1ZGVzKCdEYXNoYm9hcmQnKSAmJiAhaWQuaW5jbHVkZXMoJ01hc3RlcicpKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtYW5hbHl0aWNzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIERvY3VtZW50cywgUXVvdGVzLCBJbnN1cmFuY2UsIENsYWltc1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdEb2N1bWVudCcpIHx8IGlkLmluY2x1ZGVzKCdRdW90ZScpIHx8IGlkLmluY2x1ZGVzKCdJbnN1cmFuY2UnKSB8fCBpZC5pbmNsdWRlcygnQ2xhaW1zJykgfHwgaWQuaW5jbHVkZXMoJ0ludm9pY2UnKSB8fCBpZC5pbmNsdWRlcygnSW52b2ljaW5nJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWRvY3VtZW50cyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBdXRvbWF0aW9uLCBDcm9uLCBDb21wbGlhbmNlXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0F1dG9tYXRpb24nKSB8fCBpZC5pbmNsdWRlcygnQ3JvbicpIHx8IGlkLmluY2x1ZGVzKCdDb21wbGlhbmNlJykgfHwgaWQuaW5jbHVkZXMoJ1NlY3VyaXR5JykgfHwgaWQuaW5jbHVkZXMoJ1VzZXInKSB8fCBpZC5pbmNsdWRlcygnTm90aWZpY2F0aW9uJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWFkbWluJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEdTQywgR0E0LCBMTE1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnR1NDJykgfHwgaWQuaW5jbHVkZXMoJ0dBNCcpIHx8IGlkLmluY2x1ZGVzKCdMTE0nKSB8fCBpZC5pbmNsdWRlcygnVWx0cm9uJykgfHwgaWQuaW5jbHVkZXMoJ1RyZW5kJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWFpJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENvcmUgbGFzdCBhcyBmYWxsYmFja1xuICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENsaWVudCBwb3J0YWxcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzL2NsaWVudC8nKSB8fCBpZC5pbmNsdWRlcygnL3BhZ2VzL2NsaWVudC8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjbGllbnQtcG9ydGFsJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBHcm91cCBhbGwgY2l0eS1zcGVjaWZpYyBhc3N1cmFuY2UgcGFnZXMgdG9nZXRoZXJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9wYWdlcy9Bc3N1cmFuY2VUYXhpJykgJiYgIWlkLm1hdGNoKC9Bc3N1cmFuY2VUYXhpXFwuKHRzeHxqcykkLykpIHtcbiAgICAgICAgICAgIHJldHVybiAncGFnZXMtY2l0aWVzJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBQYWdlcyBzcGxpdCBieSByb3V0ZVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3BhZ2VzLycpKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGlkLm1hdGNoKC9wYWdlc1xcLyhbXi9dKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkgcmV0dXJuIGBwYWdlLSR7bWF0Y2hbMV0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKCcudHN4JywgJycpfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICB9XG4gICAgfSxcbiAgICBjb3B5UHVibGljRGlyOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiAxMDI0MCxcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICBwYXNzZXM6IDIsXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnLCAnY29uc29sZS53YXJuJywgJ2NvbnNvbGUuZXJyb3InXSxcbiAgICAgICAgcHVyZV9nZXR0ZXJzOiB0cnVlLFxuICAgICAgICB1bnNhZmU6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfY29tcHM6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfbWF0aDogdHJ1ZSxcbiAgICAgICAgdW5zYWZlX21ldGhvZHM6IGZhbHNlLFxuICAgICAgICBhcmd1bWVudHM6IHRydWUsXG4gICAgICAgIHJlZHVjZV92YXJzOiB0cnVlLFxuICAgICAgICByZWR1Y2VfZnVuY3M6IHRydWUsXG4gICAgICAgIGtlZXBfZmFyZ3M6IGZhbHNlLFxuICAgICAgICBrZWVwX2luZmluaXR5OiB0cnVlLFxuICAgICAgICBkZWFkX2NvZGU6IHRydWUsXG4gICAgICAgIHVudXNlZDogdHJ1ZSxcbiAgICAgICAgY29sbGFwc2VfdmFyczogdHJ1ZSxcbiAgICAgICAgaW5saW5lOiAyXG4gICAgICB9LFxuICAgICAgbWFuZ2xlOiB7XG4gICAgICAgIHNhZmFyaTEwOiB0cnVlLFxuICAgICAgICB0b3BsZXZlbDogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmb3JtYXQ6IHtcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLFxuICAgICAgICBlY21hOiAyMDIwXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIGhvc3Q6IHRydWUsXG4gIH0sXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdwcm9kdWN0aW9uJylcbiAgfVxufSkpOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7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
