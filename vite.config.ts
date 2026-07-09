import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base-Pfad muss dem GitHub-Repo-Namen entsprechen (GitHub-Pages-Stolperfalle!)
export default defineConfig({
  base: '/fittrack/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'FitTrack',
        short_name: 'FitTrack',
        description: 'Persönliches Fitness-Training: Kraft, Cardio, Dehnen, Analyse',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
