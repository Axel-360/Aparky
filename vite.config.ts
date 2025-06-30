import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import basicSsl from "@vitejs/plugin-basic-ssl"; // COMENTADO
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // basicSsl(), // COMENTADO para evitar errores SSL
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "geocoding-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "icons/*.png"], // CORREGIDO: incluir icons/
      manifest: {
        id: "/",
        name: "Car Location Tracker",
        short_name: "CarTracker",
        description: "Guarda y encuentra fácilmente donde aparcaste tu vehículo",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "es",
        categories: ["navigation", "utilities", "productivity"],
        icons: [
          {
            src: "/icons/pwa-64x64.png", // CORREGIDO: /icons/
            sizes: "64x64",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-192x192.png", // CORREGIDO: /icons/
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-512x512.png", // CORREGIDO: /icons/
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-icon-512x512.png", // CORREGIDO: /icons/
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Guardar ubicación",
            short_name: "Guardar",
            description: "Guarda rápidamente tu ubicación actual",
            url: "/?action=save",
            icons: [{ src: "/icons/pwa-192x192.png", sizes: "192x192" }], // CORREGIDO: /icons/
          },
          {
            name: "Buscar coche",
            short_name: "Buscar",
            description: "Encuentra tu coche más cercano",
            url: "/?action=search",
            icons: [{ src: "/icons/pwa-192x192.png", sizes: "192x192" }], // CORREGIDO: /icons/
          },
        ],
        screenshots: [
          {
            src: "/icons/pwa-512x512.png", // CORREGIDO: /icons/
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "/icons/pwa-192x192.png", // CORREGIDO: /icons/
            sizes: "192x192",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 3000,
    // SIN HTTPS para desarrollo
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          leaflet: ["leaflet", "react-leaflet"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-switch"],
        },
      },
    },
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "leaflet", "react-leaflet"],
  },
});
