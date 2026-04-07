import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    alias: {
      '@': resolve(__dirname, './'),
    },
    setupFiles: [resolve(__dirname, './vitest.setup.ts')],
    clearMocks: true,
    reporters: ['verbose'],
    testTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
})
