import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '@': resolve(__dirname, './'),
      '@agency/calendar': resolve(__dirname, '../../packages/calendar/src'),
    },
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
