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
        description: 'Dashboard financier personnel — revenus, dépenses, objectifs',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4D78D4',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/api\.frankfurter\.app\//,
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
