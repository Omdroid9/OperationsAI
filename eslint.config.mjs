import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent / IDE tooling (gitignored, not product code).
    ".agents/**",
    ".cursor/**",
    ".codex/**",
    ".claude/**",
    ".impeccable/**",
    ".tools/**",
  ]),
  {
    rules: {
      // Seven existing hydration/dialog-reset effects trip this rule. Kept visible as
      // warnings until each is reworked and checked in the browser; do not add new ones.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
