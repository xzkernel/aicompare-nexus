import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    fileParallelism: false,
    include: ["src/**/*.test.ts", "scripts/audit-prod.test.mjs"],
  },
});
