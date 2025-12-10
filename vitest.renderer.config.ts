import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/renderer/**/*.test.tsx', 'src/renderer/**/*.test.ts'],
    setupFiles: ['src/renderer/test/setup.ts'],
    globals: true
  },
});
