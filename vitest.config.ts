import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The eval writes a report file; it runs through `npm run eval:rag`.
    exclude: ["src/**/*.eval.test.ts", "node_modules/**"],
  },
});
