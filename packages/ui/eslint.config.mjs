import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// The package had a lint script but no config, so `pnpm lint` at the root failed before reaching
// the apps (found 2026-11-15). Same setup as apps/website.
const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
    ],
  },
]);

export default eslintConfig;
