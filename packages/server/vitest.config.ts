import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    root: "./src",
    include: ["**/*.test.ts", "**/__tests__/**/*.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/__tests__/**",
        "**/scripts/**",
      ],
    },
    // ESM support
    alias: {
      "@parerineavizate/shared": "../shared/src",
      "@pn/shared": "../shared/src",
    },
  },
});
