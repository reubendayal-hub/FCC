import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ministaevneRegister: resolve(__dirname, 'ministaevne.html'),
        ministaevneLive: resolve(__dirname, 'ministaevne-live.html'),
        // Unlisted test page — served as /handbook-review/ and /handbook-review/admin/
        // straight from the dist folder structure (no vercel.json rewrite needed).
        handbookReview: resolve(__dirname, 'handbook-review/index.html'),
        handbookReviewAdmin: resolve(__dirname, 'handbook-review/admin/index.html'),
      },
    },
  },
})
