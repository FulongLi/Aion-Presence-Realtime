import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals, ...nextTs,
  globalIgnores([".next/**", "out/**", "next-env.d.ts", ".generated/**"]),
  {
    // The vendored Presence Core and its tests keep the Plugin's own lint rules (src/presence-core/VENDORED.md).
    files: ["src/presence-core/**/*.ts", "tests/presence-core/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-control-regex": "error",
    },
  },
]);
