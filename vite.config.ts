import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'School Nurse Clinic',
        short_name: 'Nurse Clinic',
        description:
          'Student health records, visit logging, and medication tracking for school nurses.',
        theme_color: '#dc2626',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Read data (student profiles, medications, etc.) is cached for offline
        // access; writes go through the app-level Dexie queue (see src/lib/offline),
        // not the service worker cache.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-read-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
