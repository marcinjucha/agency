import type { License, Activation } from '../types'

/**
 * Factory for License test data.
 * Provides realistic defaults that can be overridden per test.
 */
export function makeLicense(overrides?: Partial<License>): License {
  return {
    id: 'lic-001',
    key: 'DF-ABCD-EFGH-IJKL',
    client_name: 'Jan Kowalski',
    email: 'jan@example.com',
    expires_at: '2027-12-31T23:59:59Z',
    is_active: true,
    max_seats: 3,
    grace_days: 7,
    created_at: '2026-04-01T10:00:00Z',
    ...overrides,
  }
}

/**
 * Factory for Activation test data.
 */
export function makeActivation(overrides?: Partial<Activation>): Activation {
  return {
    id: 'act-001',
    license_id: 'lic-001',
    machine_id: 'machine-abc123',
    machine_name: 'MacBook Pro',
    activated_at: '2026-04-02T08:00:00Z',
    last_seen_at: '2026-04-08T12:00:00Z',
    is_active: true,
    ...overrides,
  }
}
