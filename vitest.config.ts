import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    reporters: ["verbose"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/username-check-api.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
