import { defineConfig } from 'vitest/config';

// Unit tests for pure, React Native-free modules (src/lib).
export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
});
