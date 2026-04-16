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
  // These packages use #virtual imports resolved by tanstackStart plugin at build time.
  // Pre-bundling runs before plugin context is ready — must exclude.
  optimizeDeps: {
    exclude: ['@tanstack/start-server-core', '@tanstack/react-start', '@tanstack/react-router'],
  },
  plugins: [
    // Required: vite:import-analysis encounters `import("tanstack-start-injected-head-scripts:v")`
    // in @tanstack/start-server-core/router-manifest.js during dev transform, before tanstackStart
    // plugin registers the virtual module. Pre-enforce stub prevents the resolution failure.
    // jacek/kolega don't need this because they don't hit this code path in their build.
    {
      name: 'tanstack-start-virtual-modules-stub',
      enforce: 'pre' as const,
      resolveId(id: string) {
        if (id === 'tanstack-start-injected-head-scripts:v') {
          return '\0tanstack-start-injected-head-scripts:v'
        }
      },
      load(id: string) {
        if (id === '\0tanstack-start-injected-head-scripts:v') {
          // Inject React Refresh preamble so that window.__vite_plugin_react_preamble_installed__
          // is set before any React component loads. Without this, @vitejs/plugin-react
          // throws "can't detect preamble" and hook state updates never re-render.
          // This is only needed in dev — production builds don't use React Refresh.
          const preamble = command === 'serve'
            ? 'import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true'
            : undefined
          return `export const injectedHeadScripts = ${JSON.stringify(preamble)}`
        }
      },
    },
    tsConfigPaths(),
    tailwindcss(),
    // nitro() required for Vercel serverless functions — dev mode fails with ERR_LOAD_URL
    ...(command === 'build' ? [nitro()] : []),
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
