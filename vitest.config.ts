import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

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
	define: {
		global: "globalThis",
	},
});
