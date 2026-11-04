import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 15000,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/server/domain/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
