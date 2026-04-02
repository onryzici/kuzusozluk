import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
    fileParallelism: false,
    sequence: { concurrent: false },
    env: {
      DATABASE_URL: "postgresql://trexoinnovation@localhost:5432/sozluk_test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
