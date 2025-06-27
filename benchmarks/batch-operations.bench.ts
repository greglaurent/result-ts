// vitest.bench.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    benchmark: {
      include: ['**/*.bench.ts'],
      reporters: ['verbose'],
    }
  },
});
