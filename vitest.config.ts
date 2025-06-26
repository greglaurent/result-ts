import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node', // Ensure Node.js environment
    globals: false,
  },
  define: {
    // Ensure Node.js globals are available
    global: 'globalThis',
  },
});
