import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.{idea,git,cache,output,temp}/**"],
    // next-auth imports "next/server" (no .js extension) which fails under
    // vitest's ESM resolver because Next 15 has no package.json exports map.
    // Inlining next-auth forces vitest to process it through our alias resolver.
    server: {
      deps: {
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Map bare "next/server" to the explicit .js file so next-auth can import it.
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
    },
  },
});
