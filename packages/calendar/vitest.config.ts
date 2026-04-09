import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    reporters: ['verbose'],
    testTimeout: 10000,
  },
})
