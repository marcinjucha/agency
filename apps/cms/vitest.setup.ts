import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

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
