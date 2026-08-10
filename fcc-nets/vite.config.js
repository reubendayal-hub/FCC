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
      },
    },
  },
})
