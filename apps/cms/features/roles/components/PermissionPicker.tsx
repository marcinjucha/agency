'use client'

import { useCallback, useId } from 'react'
import { PERMISSION_GROUPS, type PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import { Checkbox } from '@agency/ui'
import { Lock } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionGroup = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS]

interface PermissionPickerProps {
  value: PermissionKey[]
  onChange: (keys: PermissionKey[]) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionPicker({
  value,
  onChange,
  disabled = false,
}: PermissionPickerProps) {
  const groups = Object.values(PERMISSION_GROUPS)
  const selectedSet = new Set(value)

  const toggleChild = useCallback(
    (key: PermissionKey, checked: boolean) => {
      const next = checked
        ? [...value, key]
        : value.filter((k) => k !== key)
      onChange(next)
    },
    [value, onChange],
  )

  const toggleGroup = useCallback(
    (group: PermissionGroup) => {
      const parentKey = group.key as PermissionKey
      const childKeys = group.children as readonly PermissionKey[]

      if (childKeys.length === 0) {
        // Simple toggle (no children)
        const isSelected = selectedSet.has(parentKey)
        const next = isSelected
          ? value.filter((k) => k !== parentKey)
          : [...value, parentKey]
        onChange(next)
        return
      }

      // Group with children: toggle all children + parent
      const allChildrenSelected = childKeys.every((k) => selectedSet.has(k))
      const next = allChildrenSelected
        ? value.filter(
            (k) => k !== parentKey && !(childKeys as readonly string[]).includes(k),
          )
        : [
            ...value.filter(
              (k) => k !== parentKey && !(childKeys as readonly string[]).includes(k),
            ),
            parentKey,
            ...childKeys,
          ]
      onChange(next)
    },
    [value, selectedSet, onChange],
  )

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
      role="group"
      aria-label={messages.roles.selectPermissions}
    >
      {groups.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          selectedSet={selectedSet}
          onToggleGroup={toggleGroup}
          onToggleChild={toggleChild}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group Card
// ---------------------------------------------------------------------------

function GroupCard({
  group,
  selectedSet,
  onToggleGroup,
  onToggleChild,
  disabled,
}: {
  group: PermissionGroup
  selectedSet: Set<PermissionKey>
  onToggleGroup: (group: PermissionGroup) => void
  onToggleChild: (key: PermissionKey, checked: boolean) => void
  disabled: boolean
}) {
  const groupId = useId()
  const parentKey = group.key as PermissionKey
  const childKeys = group.children as readonly PermissionKey[]
  const isAlwaysGranted = 'alwaysGranted' in group && group.alwaysGranted
  const hasChildren = childKeys.length > 0

  // Determine parent checkbox state
  const parentChecked = resolveParentState(
    parentKey,
    childKeys,
    selectedSet,
    isAlwaysGranted,
  )

  const label =
    messages.permissions[parentKey] ?? parentKey

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
            if (!isAlwaysGranted) onToggleGroup(group)
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
