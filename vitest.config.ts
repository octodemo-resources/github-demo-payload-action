import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Exclude integration tests for now
    exclude: ['./test/integration/**.ts'],
  },
})
