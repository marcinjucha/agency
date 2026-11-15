import '@testing-library/jest-dom/vitest'
import { AsyncLocalStorage } from 'node:async_hooks'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Start 1.168+ reads the request's Start context (global function middleware) on
// EVERY server fn call; outside the server runtime there is none and the call
// throws "No Start context found". Unit tests call the *Fn wrappers in-process,
// so give them an empty context: no global middleware, no request middleware ran —
// exactly what 1.167 did without a context. Real requests always carry their own
// context (runWithStartContext wins over this fallback). Same global key as
// @tanstack/start-storage-context, created here before any Start module loads.
const startStorageKey = Symbol.for('tanstack-start:start-storage-context')
const startGlobals = globalThis as Record<symbol, AsyncLocalStorage<unknown> | undefined>
startGlobals[startStorageKey] ??= new AsyncLocalStorage<unknown>()
const startStorage = startGlobals[startStorageKey]!
const realGetStore = startStorage.getStore.bind(startStorage)
const unitTestStartContext = {
  startOptions: undefined,
  contextAfterGlobalMiddlewares: {},
  executedRequestMiddlewares: new Set(),
  handlerType: 'serverFn',
  request: new Request('http://localhost/'),
  getRouter: () => {
    throw new Error('No router in unit tests')
  },
}
startStorage.getStore = () => realGetStore() ?? unitTestStartContext

// Cleanup after each test
afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.resetAllMocks()
})

// Mock @tanstack/react-router (TanStack Start migration)
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useSearch: vi.fn(() => ({})),
  useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '', href: '/', searchStr: '', state: {} })),
  useRouterState: vi.fn(() => '/'),
  Link: vi.fn(({ children }: { children: unknown }) => children),
}))

// Mock Supabase browser client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server-start.server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  })),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// Mock lucide-react — stub all icon components
// NOTE: do NOT use Proxy here — Proxy intercepts internal Vite/ESM lookups and causes hangs
vi.mock('lucide-react', () => {
  const stub = () => null
  return {
    Lock: stub, Plus: stub, Pencil: stub, Trash2: stub, XCircle: stub, Shield: stub,
    LayoutDashboard: stub, FileText: stub, Inbox: stub, Calendar: stub, Settings: stub,
    LogOut: stub, Mail: stub, Globe: stub, Newspaper: stub, Images: stub, Scale: stub,
    ShoppingBag: stub, Tags: stub, Store: stub, Zap: stub, History: stub, Users: stub,
    Building2: stub, Check: stub, Minus: stub, ChevronDown: stub, Search: stub, Star: stub, KeyRound: stub, RefreshCw: stub,
    // DownloadableAssetCard icons
    Download: stub, Image: stub, Music: stub, Video: stub, X: stub,
    // Email block-registry icons (features/email/block-registry.ts)
    AlignLeft: stub, MousePointerClick: stub, Heading: stub, ImageIcon: stub,
    AlignVerticalSpaceAround: stub, Columns2: stub, LayoutPanelTop: stub, Link: stub,
    // Email canvas toolbar (sample-data toggle)
    Eye: stub, Monitor: stub, Smartphone: stub, ChevronUp: stub, Copy: stub, FlaskConical: stub,
    // Email template list (card chevron)
    ChevronRight: stub,
  }
})

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    clear: vi.fn(),
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    resetQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
  QueryClient: vi.fn(),
  QueryClientProvider: vi.fn(({ children }) => children),
}))

// Mock @/contexts/permissions-context
vi.mock('@/contexts/permissions-context', () => ({
  usePermissions: vi.fn(() => ({
    userId: 'user-1',
    permissions: [],
    isSuperAdmin: false,
    roleName: 'member',
    tenantId: 'tenant-1',
    tenantName: 'Test Tenant',
    enabledFeatures: [],
    tenants: [],
    hasPermission: () => true,
  })),
}))
