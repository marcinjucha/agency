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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
  })),
  headers: vi.fn(() => new Headers()),
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
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
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
