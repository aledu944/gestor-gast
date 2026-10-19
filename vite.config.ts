import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    VitePWA({
      outDir: '.output/public',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'offline.html'],
      manifest: {
        id: '/',
        name: 'Gestor Gast',
        short_name: 'Gestor Gast',
        description: 'Tus pagos mensuales, pendientes y gastos bajo control.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#110B08',
        theme_color: '#110B08',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Añadir pendiente', short_name: 'Nuevo', url: '/?action=pending', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Registrar pago', short_name: 'Pago', url: '/?action=paid', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
})

export default config
