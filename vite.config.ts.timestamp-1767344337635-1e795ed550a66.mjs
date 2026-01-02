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
    target: "es2015",
    chunkSizeWarningLimit: 1e3,
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
            if (id.includes("Social") || id.includes("WhatsApp") || id.includes("Campaign")) {
              return "backoffice-marketing";
            }
            return "backoffice-core";
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
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ["console.log"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnbG9nby5zdmcnLCAnbG9nby01MTJ4NTEyLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1RheGlBc3N1ciAtIEFzc3VyYW5jZSBUYXhpIFByb2Zlc3Npb25uZWxsZScsXG4gICAgICAgIHNob3J0X25hbWU6ICdUYXhpQXNzdXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvdXJ0aWVyIHNwXHUwMEU5Y2lhbGlzdGUgZW4gYXNzdXJhbmNlIHRheGkuIERldmlzIGdyYXR1aXQgZW4gMiBtaW51dGVzLicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzAwMDAwMCcsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLTUxMng1MTIuc3ZnJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLGpwZyxqcGVnLHdlYnB9J10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9kcm9oaHhya29lcXVqcGh2YWJ2cVxcLnN1cGFiYXNlXFwuY29cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3N1cGFiYXNlLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgbW9kZSA9PT0gJ2FuYWx5emUnICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfVxuICB9LFxuICBiYXNlOiAnLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsnQHNlbnRyeS9yZWFjdCddLFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygnc2NoZWR1bGVyJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcmVhY3QnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyb3V0ZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yb3V0ZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdsdWNpZGUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3N1cGFiYXNlJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itc3VwYWJhc2UnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2JhY2tvZmZpY2UvJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQ1JNJykgfHwgaWQuaW5jbHVkZXMoJ0xlYWQnKSB8fCBpZC5pbmNsdWRlcygnUGlwZWxpbmUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtY3JtJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQUknKSB8fCBpZC5pbmNsdWRlcygnTWFzdGVyJykgfHwgaWQuaW5jbHVkZXMoJ0F1dG9ub21vdXMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtYWknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdCYWNrbGluaycpIHx8IGlkLmluY2x1ZGVzKCdTRU8nKSB8fCBpZC5pbmNsdWRlcygnQ29udGVudCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYmFja29mZmljZS1zZW8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdTb2NpYWwnKSB8fCBpZC5pbmNsdWRlcygnV2hhdHNBcHAnKSB8fCBpZC5pbmNsdWRlcygnQ2FtcGFpZ24nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhY2tvZmZpY2UtbWFya2V0aW5nJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnYmFja29mZmljZS1jb3JlJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9saWIvc3VwYWJhc2UnKSB8fCBpZC5pbmNsdWRlcygnL2xpYi9hdXRoJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnbGliLWNvcmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3BhZ2VzLycpKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGlkLm1hdGNoKC9wYWdlc1xcLyhbXi9dKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkgcmV0dXJuIGBwYWdlLSR7bWF0Y2hbMV0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKCcudHN4JywgJycpfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJyxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICB9XG4gICAgfSxcbiAgICBjb3B5UHVibGljRGlyOiB0cnVlLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IGZhbHNlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICBwYXNzZXM6IDIsXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnXVxuICAgICAgfSxcbiAgICAgIG1hbmdsZToge1xuICAgICAgICBzYWZhcmkxMDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIGZvcm1hdDoge1xuICAgICAgICBjb21tZW50czogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgfSxcbiAgcHVibGljRGlyOiAncHVibGljJyxcbiAgZGVmaW5lOiB7XG4gICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ3Byb2R1Y3Rpb24nKVxuICB9XG59KSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsa0JBQWtCO0FBQzNCLE9BQU8sVUFBVTtBQUpqQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLFlBQVksa0JBQWtCO0FBQUEsTUFDN0QsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFB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
