import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: '年周視差シミュレーター',
        short_name: '視差シム',
        description: '地球の公転と恒星の見かけの動き（年周視差）を3つの視点・グラフ・ミッション・クイズで学べるシミュレーター',
        theme_color: '#050a14',
        background_color: '#050a14',
        display: 'standalone',
        start_url: '/stellar-parallax-sim/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  base: '/stellar-parallax-sim/',
  build: {
    // three.js を含む 3D ビューは遅延読み込みの別チャンク
    chunkSizeWarningLimit: 1000,
  },
})
