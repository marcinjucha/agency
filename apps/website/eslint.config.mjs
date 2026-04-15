import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    ignores: [
      ".output/**",
      ".vinxi/**",
      "node_modules/**",
      "app/routeTree.gen.ts",
    ],
  },
]);

export default eslintConfig;
