import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// The CMS left Next.js for TanStack Start; the old config imported eslint-config-next, which is no
// longer installed, so lint did not start at all (found 2026-11-15). Same rule subset the app got
// from eslint-config-next, as ported in course-platform's eslint.config.js.
export default tseslint.config(
  {
    ignores: ['.output/**', '.tanstack/**', '.vercel/**', 'dist/**', 'node_modules/**', 'app/routeTree.gen.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      // Only the two classic hook rules: v7's other rules check code for the React Compiler, which
      // does not run here (see vite.config.ts).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Warn, not error: the code reads Supabase through `(supabase as any)` in many places.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
