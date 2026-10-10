import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'MyFinanx',
        short_name: 'MyFinanx',
        description: 'Dashboard financier personnel : revenus, dépenses, objectifs',
        id: '/',
        lang: 'fr',
        categories: ['finance', 'productivity'],
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2F6BFF',
        orientation: 'portrait-primary',
        shortcuts: [
          { name: 'Scanner un ticket', short_name: 'Scanner', url: '/?action=scan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Ajouter une dépense', short_name: 'Ajouter', url: '/?action=add', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
        ],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Polices : seuls les sous-ensembles latins sont précachés (les autres restent chargés à la demande)
        globIgnores: ['OneSignalSDKWorker.js', '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2', '**/*.woff', '**/pdf*.mjs', '**/pdf*.js'],
        runtimeCaching: [
          {
            // pdf.js : chargé au premier PDF importé, puis gardé en cache (hors précache, trop lourd)
            urlPattern: ({ url }) => /\/assets\/pdf.*\.m?js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs', expiration: { maxEntries: 6 } }
          },
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/api\.frankfurter\.dev\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'exchange-rates',
              expiration: { maxEntries: 5, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ]
});
