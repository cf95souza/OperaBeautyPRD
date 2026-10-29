import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      }
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // NÃO injetar registro automático — o manifest é dinâmico via script inline no index.html
      injectRegister: null,
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        importScripts: ['/custom-sw.js'],
        // Garantir que navegação sempre retorna o /index.html raiz (SPA)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
            }
          },
          {
            urlPattern: ({ url }) => !url.pathname.startsWith('/api') && !url.pathname.startsWith('/uploads'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets-cache',
            }
          }
        ]
      },
      // CRÍTICO: false desabilita a geração de manifest estático.
      // O manifest é injetado dinamicamente pelo script no index.html
      // baseado na URL atual para suportar multi-tenant PWA.
      manifest: false,
      // Desabilitar injeção de link de manifest pelo plugin
      injectManifest: {
        injectionPoint: undefined
      }
    })
  ],
})
