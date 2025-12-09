import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts'],
    exclude: ['src/renderer/**'], // Renderer tests might need jsdom, separate config or unified?
  },
});
