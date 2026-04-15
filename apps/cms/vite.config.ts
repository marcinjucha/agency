import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => {
  // loadEnv reads .env.local (and .env.*) files — required because plain
  // defineConfig() runs before Vite has loaded the env files.
  // The empty string prefix loads ALL vars (not just VITE_* ones).
  const env = loadEnv(mode, process.cwd(), '')

  return {
  server: {
    port: 3001,
  },
  // Expose NEXT_PUBLIC_* vars to the browser bundle.
  // Next.js does this automatically; Vite requires explicit static replacement.
  // Uses loadEnv so .env.local is properly read before substitution.
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    'process.env.NEXT_PUBLIC_WEBSITE_URL': JSON.stringify(env.NEXT_PUBLIC_WEBSITE_URL),
  },
  // Exclude TanStack Start internals from dep pre-bundling.
  // These packages use #virtual imports resolved by the tanstackStart plugin
  // at main-build time — pre-bundling runs before plugin context is ready.
  optimizeDeps: {
    exclude: [
      '@tanstack/start-server-core',
      '@tanstack/react-start',
      '@tanstack/react-router',
    ],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'app',
      router: {
        routesDirectory: 'routes',
      },
    }),
    viteReact({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  }
})
