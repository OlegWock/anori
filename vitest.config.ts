import path from "node:path";
import { defineConfig } from "vitest/config";

// biome-ignore lint/style/noDefaultExport: required by vitest
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/utils/storage/**"],
    },
  },
  resolve: {
    alias: {
      "@anori/utils": path.resolve(__dirname, "./src/utils"),
      "@anori/components": path.resolve(__dirname, "./src/components"),
      "@anori/assets": path.resolve(__dirname, "./src/assets"),
      "@anori/plugins": path.resolve(__dirname, "./src/plugins"),
      "@anori/translations": path.resolve(__dirname, "./src/translations"),
      "@anori/cloud-integration": path.resolve(__dirname, "./src/cloud-integration"),
    },
  },
});
