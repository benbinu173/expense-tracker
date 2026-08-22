import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Vitest needs the `@/*` alias spelled out — it doesn't read `paths` from
 * tsconfig.json. Without this, any `lib/` module that imports a sibling via
 * `@/lib/...` fails to resolve under test even though it compiles fine.
 *
 * Kept in sync with `compilerOptions.paths` in tsconfig.json by hand; there are
 * only two entries and one of them is this.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
