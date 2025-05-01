import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Removido pois agora são referenciados abaixo ou devem vir de public
      manifest: {
        name: 'MindWell Assist',
        short_name: 'MindWell',
        description: 'Mental health self-assessment and resource platform.',
        theme_color: '#ffffff', // Cor principal da UI
        background_color: '#ffffff', // Cor de fundo para splash screen
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'src/assets/images/pwa-192x192.png', // Caminho dentro de src
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'src/assets/images/pwa-512x512.png', // Caminho dentro de src
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'src/assets/images/pwa-maskable-512x512.png', // Caminho dentro de src (ou use o pwa-512x512.png se for mascarável)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,jpg,mp3}'], // Adicionado jpg, mp3
        maximumFileSizeToCacheInBytes: 200 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
           {
             // Cache para imagens importadas de src (gerenciadas pelo workbox)
             urlPattern: ({ request }) => request.destination === 'image',
             handler: 'CacheFirst',
             options: {
               cacheName: 'image-assets-cache',
               expiration: {
                 maxEntries: 100,
                 maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
           },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/autoavaliacao') || url.pathname.startsWith('/recursos') || url.pathname.startsWith('/audio/'), // Adicionado audio
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-core-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request, url }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-assets-cache', // Cache separado para fontes
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
           {
             // Cache para o áudio (se estiver em /public/audio)
             urlPattern: ({ request }) => request.destination === 'audio' || request.destination === 'video',
             handler: 'CacheFirst',
             options: {
               cacheName: 'media-cache',
               expiration: {
                 maxEntries: 10,
                 maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
           },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'), // Cache para API (ajuste a URL base se necessário)
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50, // Aumentado um pouco
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})