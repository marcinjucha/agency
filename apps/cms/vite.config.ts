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
  // Exclude TanStack Start internals from dep pre-bundling.
  // These packages use #virtual imports resolved by the tanstackStart plugin
  // at main-build time — pre-bundling runs before plugin context is ready.
  optimizeDeps: {
    exclude: ['@tanstack/start-server-core', '@tanstack/react-start', '@tanstack/react-router'],
  },
  plugins: [
    // Workaround: vite:import-analysis fails to resolve TanStack Start virtual modules
    // before the tanstackStart plugin registers them. This pre-enforce stub prevents
    // the "Failed to resolve import" error during dev SSR.
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
          return 'export const injectedHeadScripts = undefined'
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
