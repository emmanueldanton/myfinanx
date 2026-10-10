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
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Polices : seuls les sous-ensembles latins sont précachés (les autres restent chargés à la demande)
        globIgnores: ['OneSignalSDKWorker.js', '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2', '**/*.woff'],
        runtimeCaching: [
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
