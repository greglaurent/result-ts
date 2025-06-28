import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    benchmark: {
      include: ["**/*.bench.ts"],
      exclude: ["node_modules/**", "dist/**"],
      reporters: ["verbose"],
      outputFile: "benchmark-results.json",
    },
  },
  resolve: {
    alias: {
      "@": "./src",
      "~": "./src",
    },
  },
  define: {
    global: "globalThis",
  },
});
