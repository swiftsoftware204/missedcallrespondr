import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/modules/core'),
      '@sms': resolve(__dirname, 'src/modules/sms'),
      '@leads': resolve(__dirname, 'src/modules/leads'),
      '@analytics': resolve(__dirname, 'src/modules/analytics'),
      '@templates': resolve(__dirname, 'src/modules/templates'),
      '@agency': resolve(__dirname, 'src/modules/agency'),
      '@shared': resolve(__dirname, 'src/modules/shared'),
    },
  },
})
