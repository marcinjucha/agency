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
    // Required: vite:import-analysis encounters `import("tanstack-start-injected-head-scripts:v")`
    // in @tanstack/start-server-core/router-manifest.js during dev transform, before tanstackStart
    // plugin registers the virtual module. Pre-enforce stub guarantees resolution even when
    // lazy-discovered deps (seroval, @tanstack/history, h3-v2, etc.) transitively pull
    // start-server-core through esbuild optimizer (outside plugin chain). NOT masking — this
    // is the upstream-recommended workaround for Vite import-analysis vs plugin-context ordering
    // (originally added in commit e686ae2, accidentally removed in 18b8b03 during shop fix).
    // optimizeDeps.exclude alone is insufficient because excluded packages can still appear in
    // bundle when transitively reached through pre-bundled deps.
    {
      name: 'tanstack-start-virtual-modules-stub',
      enforce: 'pre' as const,
      // Match ALL suffix variants (:v, :s, ...) — TanStack Start may emit different ones
      // depending on environment/version. startsWith is defensive vs strict equality.
      resolveId(id: string) {
        if (id.startsWith('tanstack-start-injected-head-scripts:')) {
          return '\0' + id
        }
      },
      load(id: string) {
        if (id.startsWith('\0tanstack-start-injected-head-scripts:')) {
          // Inject React Refresh preamble so window.__vite_plugin_react_preamble_installed__
          // is set before any React component loads. Without this, @vitejs/plugin-react
          // throws "can't detect preamble" and hook state updates never re-render. Dev only.
          const preamble = command === 'serve'
            ? 'import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true'
            : undefined
          return `export const injectedHeadScripts = ${JSON.stringify(preamble)}`
        }
      },
    },
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
