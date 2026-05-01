import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { nitro } from 'nitro/vite'

export default defineConfig(({ command }) => ({
  server: {
    port: 3001,
  },
  // Force single React instance across pre-bundled (optimizeDeps) and excluded
  // packages. Without dedupe, @tanstack/react-router (excluded) resolves react
  // via Node module resolution — different instance than Vite's pre-bundled
  // react.js — useContext returns null because Provider was created by other
  // React instance. Fixes "Cannot read properties of null (reading 'useContext')"
  // crashes in useRouter / useNavigate / useContext callers.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // These packages use #virtual imports resolved by tanstackStart plugin at build time.
  // Pre-bundling runs before plugin context is ready — must exclude.
  // @tanstack/router-core/ssr/server is lazy-discovered on first browser request
  // and transitively pulls start-server-core (with its virtual module imports)
  // through esbuild optimizer (outside plugin chain) → causes
  // "tanstack-start-injected-head-scripts:v" resolve failure. Excluding the whole
  // router-core package keeps the optimizer from re-bundling it on lazy discovery.
  optimizeDeps: {
    exclude: [
      '@tanstack/start-server-core',
      '@tanstack/react-start',
      '@tanstack/react-router',
      '@tanstack/router-core',
    ],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // nitro() required for Vercel serverless functions — dev mode fails with ERR_LOAD_URL.
    // preset: 'vercel' — writes Build Output API v3 to .vercel/output/ (not .output/).
    // Without this, Vercel deploys fail with "No Output Directory named 'dist' found".
    ...(command === 'build' ? [nitro({ preset: 'vercel' })] : []),
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
}))
