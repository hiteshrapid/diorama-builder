import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@diorama/engine": path.resolve(__dirname, "packages/engine/src"),
      "@diorama/plugins": path.resolve(__dirname, "packages/plugins/src"),
      "@diorama/cli": path.resolve(__dirname, "packages/cli/src"),
      "@diorama/ui": path.resolve(__dirname, "packages/ui/src"),
    },
  },
});
