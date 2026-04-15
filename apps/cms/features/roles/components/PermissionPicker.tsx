

import { useCallback, useId } from 'react'
import { PERMISSION_GROUPS, type PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import { Checkbox } from '@agency/ui'
import { Lock } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionGroup = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS]

/** Display-only grouping — remaps PERMISSION_GROUPS for UI rendering without changing permission logic. */
interface DisplayGroup {
  label: string
  parentKey: string
  children: readonly PermissionKey[]
  alwaysGranted: boolean
}

interface PermissionPickerProps {
  value: PermissionKey[]
  onChange: (keys: PermissionKey[]) => void
  disabled?: boolean
  /** When provided, only show groups whose key (or any child) is in this list. Dashboard (alwaysGranted) always shown. */
  enabledFeatures?: PermissionKey[]
}

// ---------------------------------------------------------------------------
// Display Groups — visual split of PERMISSION_GROUPS for PermissionPicker UI
// ---------------------------------------------------------------------------

function buildDisplayGroups(): DisplayGroup[] {
  const groups: DisplayGroup[] = []
  for (const group of Object.values(PERMISSION_GROUPS)) {
    if (group.key === 'system') {
      // Split system into two display cards
      groups.push({
        label: messages.permissions.system,
        parentKey: 'system',
        children: ['system.email_templates', 'system.settings'] as const,
        alwaysGranted: false,
      })
      groups.push({
        label: messages.permissions.management,
        parentKey: 'system',
        children: ['system.users', 'system.roles', 'system.tenants'] as const,
        alwaysGranted: false,
      })
    } else {
      groups.push({
        label: messages.permissions[group.key] ?? group.key,
        parentKey: group.key,
        children: group.children as readonly PermissionKey[],
        alwaysGranted: 'alwaysGranted' in group && !!group.alwaysGranted,
      })
    }
  }
  return groups
}

const DISPLAY_GROUPS = buildDisplayGroups()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionPicker({
  value,
  onChange,
  disabled = false,
  enabledFeatures,
}: PermissionPickerProps) {
  const displayGroups = filterDisplayGroupsByEnabledFeatures(
    DISPLAY_GROUPS,
    enabledFeatures,
  )
  const selectedSet = new Set(value)

  const toggleChild = useCallback(
    (key: PermissionKey, checked: boolean) => {
      // Find the parent group for this child key (from real PERMISSION_GROUPS)
      const parentGroup = Object.values(PERMISSION_GROUPS).find((group) =>
        (group.children as readonly string[]).includes(key),
      )
      const parentKey = parentGroup?.key as PermissionKey | undefined
      const siblingKeys = (parentGroup?.children ?? []) as readonly PermissionKey[]

      if (checked) {
        const next = [...value, key]
        if (parentKey && siblingKeys.every((k) => k === key || selectedSet.has(k))) {
          next.push(parentKey)
        }
        onChange(next)
      } else {
        const next = value.filter(
          (k) => k !== key && k !== parentKey,
        )
        onChange(next)
      }
    },
    [value, selectedSet, onChange],
  )

  const toggleDisplayGroup = useCallback(
    (displayGroup: DisplayGroup) => {
      const parentKey = displayGroup.parentKey as PermissionKey
      const childKeys = displayGroup.children

      if (childKeys.length === 0) {
        const isSelected = selectedSet.has(parentKey)
        const next = isSelected
          ? value.filter((k) => k !== parentKey)
          : [...value, parentKey]
        onChange(next)
        return
      }

      // Toggle only THIS display group's children
      const allChildrenSelected = childKeys.every((k) => selectedSet.has(k))
      if (allChildrenSelected) {
        // Uncheck this group's children. Remove parent only if no other system children are selected.
        const childSet = new Set<string>(childKeys)
        const next = value.filter((k) => !childSet.has(k))
        // Check if any remaining children from the same parent are still selected
        const realGroup = Object.values(PERMISSION_GROUPS).find((g) => g.key === displayGroup.parentKey)
        const allParentChildren = (realGroup?.children ?? []) as readonly PermissionKey[]
        const remainingSelected = allParentChildren.some((k) => !childSet.has(k) && selectedSet.has(k))
        if (!remainingSelected) {
          return onChange(next.filter((k) => k !== parentKey))
        }
        onChange(next)
      } else {
        // Check all this group's children
        const next = [
          ...value.filter((k) => !(childKeys as readonly string[]).includes(k)),
          ...childKeys,
        ]
        // Add parent if ALL real children are now selected
        const realGroup = Object.values(PERMISSION_GROUPS).find((g) => g.key === displayGroup.parentKey)
        const allParentChildren = (realGroup?.children ?? []) as readonly PermissionKey[]
        const allRealSelected = allParentChildren.every((k) => childKeys.includes(k) || selectedSet.has(k))
        if (allRealSelected && !next.includes(parentKey)) {
          next.push(parentKey)
        }
        onChange(next)
      }
    },
    [value, selectedSet, onChange],
  )

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
      role="group"
      aria-label={messages.roles.selectPermissions}
    >
      {displayGroups.map((dg) => (
        <DisplayGroupCard
          key={`${dg.parentKey}-${dg.label}`}
          displayGroup={dg}
          selectedSet={selectedSet}
          onToggleGroup={toggleDisplayGroup}
          onToggleChild={toggleChild}
          disabled={disabled}
          enabledFeatures={enabledFeatures}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Display Group Card
// ---------------------------------------------------------------------------

function DisplayGroupCard({
  displayGroup,
  selectedSet,
  onToggleGroup,
  onToggleChild,
  disabled,
  enabledFeatures,
}: {
  displayGroup: DisplayGroup
  selectedSet: Set<PermissionKey>
  onToggleGroup: (dg: DisplayGroup) => void
  onToggleChild: (key: PermissionKey, checked: boolean) => void
  disabled: boolean
  enabledFeatures?: PermissionKey[]
}) {
  const groupId = useId()
  const parentKey = displayGroup.parentKey as PermissionKey
  const childKeys = filterChildrenByEnabledFeatures(parentKey, displayGroup.children, enabledFeatures)
  const isAlwaysGranted = displayGroup.alwaysGranted
  const hasChildren = childKeys.length > 0

  const parentChecked = resolveParentState(
    parentKey,
    childKeys,
    selectedSet,
    isAlwaysGranted,
  )

  const label = displayGroup.label

  return (
    <div
      className="rounded-lg border border-border bg-card p-3"
      role="group"
      aria-labelledby={`${groupId}-label`}
    >
      {/* Group header */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${groupId}-parent`}
          checked={parentChecked}
          onCheckedChange={() => {
            if (!isAlwaysGranted) onToggleGroup(displayGroup)
          }}
          disabled={disabled || isAlwaysGranted}
          aria-label={label}
        />
        <label
          id={`${groupId}-label`}
          htmlFor={`${groupId}-parent`}
          className="text-sm font-medium text-foreground cursor-pointer select-none flex items-center gap-1.5"
        >
          {label}
          {isAlwaysGranted && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {messages.permissions.alwaysGranted}
            </span>
          )}
        </label>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="mt-2.5 ml-6 space-y-2" role="group">
          {childKeys.map((childKey) => (
            <ChildCheckbox
              key={childKey}
              permissionKey={childKey}
              checked={selectedSet.has(childKey)}
              onCheckedChange={(checked) =>
                onToggleChild(childKey, checked as boolean)
              }
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Child Checkbox
// ---------------------------------------------------------------------------

function ChildCheckbox({
  permissionKey,
  checked,
  onCheckedChange,
  disabled,
}: {
  permissionKey: PermissionKey
  checked: boolean
  onCheckedChange: (checked: boolean | 'indeterminate') => void
  disabled: boolean
}) {
  const id = useId()
  const label =
    messages.permissions[permissionKey] ?? permissionKey

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className="text-sm text-muted-foreground cursor-pointer select-none"
      >
        {label}
      </label>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Filter display groups to only include those with enabled features.
 * alwaysGranted groups always shown. Groups with no enabled children are hidden.
 */
function filterDisplayGroupsByEnabledFeatures(
  groups: DisplayGroup[],
  enabledFeatures?: PermissionKey[],
): DisplayGroup[] {
  if (!enabledFeatures) return groups
  const enabledSet = new Set<string>(enabledFeatures)
  return groups.filter((group) => {
    if (group.alwaysGranted) return true
    if (enabledSet.has(group.parentKey)) return true
    return group.children.some((child) => enabledSet.has(child))
  })
}

/**
 * Filter children within a group based on enabledFeatures.
 * - undefined enabledFeatures → all children (backward compat)
 * - Parent key in enabledFeatures → all children (prefix match)
 * - Otherwise → only children whose key is in enabledFeatures
 */
function filterChildrenByEnabledFeatures(
  parentKey: PermissionKey,
  childKeys: readonly PermissionKey[],
  enabledFeatures?: PermissionKey[],
): readonly PermissionKey[] {
  if (!enabledFeatures) return childKeys
  const enabledSet = new Set<string>(enabledFeatures)
  if (enabledSet.has(parentKey)) return childKeys
  return childKeys.filter((child) => enabledSet.has(child))
}

function resolveParentState(
  parentKey: PermissionKey,
  childKeys: readonly PermissionKey[],
  selectedSet: Set<PermissionKey>,
  isAlwaysGranted?: boolean,
): boolean | 'indeterminate' {
  if (isAlwaysGranted) return true

  // No children: simple toggle
  if (childKeys.length === 0) {
    return selectedSet.has(parentKey)
  }

  // With children: derive from child state
  const selectedCount = childKeys.filter((k) => selectedSet.has(k)).length
  if (selectedCount === 0) return false
  if (selectedCount === childKeys.length) return true
  return 'indeterminate'
}
