'use client'

import { PermissionPicker } from '@/features/roles/components/PermissionPicker'
import type { PermissionKey } from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureFlagSelectorProps {
  value: PermissionKey[]
  onChange: (keys: PermissionKey[]) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Thin wrapper around PermissionPicker for tenant feature flag selection.
 *
 * Uses the same card layout with parent groups and child checkboxes.
 * Dashboard is always granted (handled by PermissionPicker's alwaysGranted).
 * No enabledFeatures filter — tenant form shows ALL permission groups
 * because this IS where features get enabled/disabled.
 */
export function FeatureFlagSelector({
  value,
  onChange,
  disabled = false,
}: FeatureFlagSelectorProps) {
  return (
    <PermissionPicker
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  )
}
