import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // NÃO injetar registro automático — o manifest é dinâmico via script inline no index.html
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        importScripts: ['/custom-sw.js'],
        // Garantir que navegação sempre retorna o index.html (SPA)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fallback-cache',
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
