import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    // Same as the CMS and the shops: `any` is a warning (Supabase reads go through `as any`),
    // unused names prefixed with `_` are allowed.
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      ".output/**",
      ".vinxi/**",
      ".vercel/**",
      ".tanstack/**",
      "node_modules/**",
      "app/routeTree.gen.ts",
    ],
  },
]);

export default eslintConfig;
