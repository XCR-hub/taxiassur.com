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
    target: "es2020",
    chunkSizeWarningLimit: 500,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        return deps.filter(
          (dep) => dep.includes("vendor-react") || dep.includes("lib-core")
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
          if (id.includes("/backoffice/")) {
            if (id.includes("CRM") || id.includes("Lead") || id.includes("Pipeline")) {
              return "backoffice-crm";
            }
            if (id.includes("AI") || id.includes("Master") || id.includes("Autonomous")) {
              return "backoffice-ai";
            }
            if (id.includes("Backlink") || id.includes("SEO") || id.includes("Content")) {
              return "backoffice-seo";
            }
            if (id.includes("Social") || id.includes("WhatsApp") || id.includes("Campaign") || id.includes("Email")) {
              return "backoffice-marketing";
            }
            if (id.includes("Analytics") || id.includes("Dashboard") && !id.includes("Master")) {
              return "backoffice-analytics";
            }
            return "backoffice-core";
          }
          if (id.includes("/components/charts/")) {
            return "charts";
          }
          if (id.includes("/components/client/") || id.includes("/pages/client/")) {
            return "client-portal";
          }
          if (id.includes("/lib/supabase") || id.includes("/lib/auth")) {
            return "lib-core";
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
    assetsInlineLimit: 8192,
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ["console.log", "console.info", "console.debug"],
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnbG9nby5zdmcnLCAnbG9nby01MTJ4NTEyLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1RheGlBc3N1ciAtIEFzc3VyYW5jZSBUYXhpIFByb2Zlc3Npb25uZWxsZScsXG4gICAgICAgIHNob3J0X25hbWU6ICdUYXhpQXNzdXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvdXJ0aWVyIHNwXHUwMEU5Y2lhbGlzdGUgZW4gYXNzdXJhbmNlIHRheGkuIERldmlzIGdyYXR1aXQgZW4gMiBtaW51dGVzLicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzAwMDAwMCcsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLTUxMng1MTIuc3ZnJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLGpwZyxqcGVnLHdlYnB9J10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9kcm9oaHhya29lcXVqcGh2YWJ2cVxcLnN1cGFiYXNlXFwuY29cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N1cGFiYXNlLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgbW9kZSA9PT0gJ2FuYWx5emUnICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfVxuICB9LFxuICBiYXNlOiAnLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMCxcbiAgICBtb2R1bGVQcmVsb2FkOiB7XG4gICAgICBwb2x5ZmlsbDogZmFsc2UsXG4gICAgICByZXNvbHZlRGVwZW5kZW5jaWVzOiAoZmlsZW5hbWUsIGRlcHMpID0+IHtcbiAgICAgICAgcmV0dXJuIGRlcHMuZmlsdGVyKGRlcCA9PlxuICAgICAgICAgIGRlcC5pbmNsdWRlcygndmVuZG9yLXJlYWN0JykgfHxcbiAgICAgICAgICBkZXAuaW5jbHVkZXMoJ2xpYi1jb3JlJylcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbJ0BzZW50cnkvcmVhY3QnXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ3NjaGVkdWxlcicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJlYWN0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncm91dGVyJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itcm91dGVyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItaWNvbnMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzdXBhYmFzZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXN1cGFiYXNlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9iYWNrb2ZmaWNlLycpKSB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0NSTScpIHx8IGlkLmluY2x1ZGVzKCdMZWFkJykgfHwgaWQuaW5jbHVkZXMoJ1BpcGVsaW5lJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNybSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0FJJykgfHwgaWQuaW5jbHVkZXMoJ01hc3RlcicpIHx8IGlkLmluY2x1ZGVzKCdBdXRvbm9tb3VzJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWFpJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQmFja2xpbmsnKSB8fCBpZC5pbmNsdWRlcygnU0VPJykgfHwgaWQuaW5jbHVkZXMoJ0NvbnRlbnQnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2Utc2VvJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnU29jaWFsJykgfHwgaWQuaW5jbHVkZXMoJ1doYXRzQXBwJykgfHwgaWQuaW5jbHVkZXMoJ0NhbXBhaWduJykgfHwgaWQuaW5jbHVkZXMoJ0VtYWlsJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLW1hcmtldGluZyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0FuYWx5dGljcycpIHx8IGlkLmluY2x1ZGVzKCdEYXNoYm9hcmQnKSAmJiAhaWQuaW5jbHVkZXMoJ01hc3RlcicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYmFja29mZmljZS1hbmFseXRpY3MnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdiYWNrb2ZmaWNlLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNcdTAwRTlwYXJlciBsZXMgY2hhcnRzIGRhbnMgbGV1ciBwcm9wcmUgY2h1bmtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzL2NoYXJ0cy8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjaGFydHMnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNcdTAwRTlwYXJlciBsJ2VzcGFjZSBjbGllbnRcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzL2NsaWVudC8nKSB8fCBpZC5pbmNsdWRlcygnL3BhZ2VzL2NsaWVudC8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjbGllbnQtcG9ydGFsJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9saWIvc3VwYWJhc2UnKSB8fCBpZC5pbmNsdWRlcygnL2xpYi9hdXRoJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnbGliLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3BhZ2VzLycpKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGlkLm1hdGNoKC9wYWdlc1xcLyhbXi9dKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkgcmV0dXJuIGBwYWdlLSR7bWF0Y2hbMV0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKCcudHN4JywgJycpfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICB9XG4gICAgfSxcbiAgICBjb3B5UHVibGljRGlyOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiA4MTkyLFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgIHBhc3NlczogMixcbiAgICAgICAgcHVyZV9mdW5jczogWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZyddLFxuICAgICAgICBwdXJlX2dldHRlcnM6IGZhbHNlLFxuICAgICAgICB1bnNhZmU6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfY29tcHM6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfbWF0aDogdHJ1ZSxcbiAgICAgICAgdW5zYWZlX21ldGhvZHM6IGZhbHNlLFxuICAgICAgICBhcmd1bWVudHM6IGZhbHNlLFxuICAgICAgICByZWR1Y2VfdmFyczogdHJ1ZSxcbiAgICAgICAgcmVkdWNlX2Z1bmNzOiB0cnVlLFxuICAgICAgICBrZWVwX2ZhcmdzOiBmYWxzZSxcbiAgICAgICAga2VlcF9pbmZpbml0eTogdHJ1ZVxuICAgICAgfSxcbiAgICAgIG1hbmdsZToge1xuICAgICAgICBzYWZhcmkxMDogdHJ1ZSxcbiAgICAgICAgdG9wbGV2ZWw6IGZhbHNlXG4gICAgICB9LFxuICAgICAgZm9ybWF0OiB7XG4gICAgICAgIGNvbW1lbnRzOiBmYWxzZSxcbiAgICAgICAgZWNtYTogMjAyMFxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiB0cnVlLFxuICB9LFxuICBwdWJsaWNEaXI6ICdwdWJsaWMnLFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAncHJvZHVjdGlvbicpXG4gIH1cbn0pKTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxrQkFB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
