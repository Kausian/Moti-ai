import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest runs the pure chunking + retrieval logic in a Node environment.
// The `@/*` alias mirrors tsconfig so tests import modules the same way the app
// does. No browser or React testing environment is configured in this phase.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
