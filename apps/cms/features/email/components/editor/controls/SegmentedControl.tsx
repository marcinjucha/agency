import { useRef, type ReactNode, type KeyboardEvent } from 'react'
import { cn } from '@agency/ui'

/**
 * SegmentedControl — group of buttons that act as a single-select radio control.
 *
 * Generic over T so consumers keep their domain types (`'h1' | 'h2' | 'h3'`,
 * `'left' | 'center' | 'right'`, etc.) without string-casting at the call site.
 *
 * Accessibility:
 * - `role="radiogroup"` on the wrapper + `role="radio"` on each option
 * - `aria-checked` reflects the selected state for screen readers
 * - `aria-label` (or `label`-derived `aria-labelledby`) describes the group
 * - Roving tabindex: only the selected radio is in the tab order; arrow keys
 *   move focus + selection (Home/End jump to first/last). Matches WAI-ARIA
 *   radio group pattern.
 * - Dev-mode warning when neither `label` nor `aria-label` is provided.
 *
 * Visual:
 * - Outer track: `bg-secondary/40`, rounded, padding 2px
 * - Selected: `bg-card text-foreground shadow-sm`
 * - Unselected: `text-muted-foreground hover:text-foreground`
 * - WCAG focus ring via `focus-visible:ring-2`
 */
export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedControlOption<T>[]
  /** Visible label rendered above the control. */
  label?: string
  /** Screen-reader label (used when no visible label is provided). */
  'aria-label'?: string
  className?: string
  /** Optional id for label association (htmlFor). */
  id?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  'aria-label': ariaLabel,
  className,
  id,
}: SegmentedControlProps<T>) {
  const groupAriaLabel = ariaLabel ?? label

  // P2-1: dev-mode warning — group must have an accessible name (either visible
  // `label` or screen-reader `aria-label`). Missing both = invisible to AT.
  if (process.env.NODE_ENV === 'development' && !ariaLabel && !label) {
    // eslint-disable-next-line no-console
    console.warn(
      'SegmentedControl: must provide either `label` or `aria-label` for accessibility',
    )
  }

  // Roving tabindex refs — focusing the new selection after keyboard navigation.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const selectedIndex = options.findIndex((option) => option.value === value)

  const focusOption = (index: number) => {
    const target = buttonRefs.current[index]
    if (target) target.focus()
  }

  const moveSelection = (delta: number) => {
    const total = options.length
    if (total === 0) return
    const currentIndex = selectedIndex === -1 ? 0 : selectedIndex
    const nextIndex = (currentIndex + delta + total) % total
    const next = options[nextIndex]
    if (next) {
      onChange(next.value)
      focusOption(nextIndex)
    }
  }

  const jumpTo = (index: number) => {
    const target = options[index]
    if (target) {
      onChange(target.value)
      focusOption(index)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        moveSelection(-1)
        return
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        moveSelection(1)
        return
      case 'Home':
        event.preventDefault()
        jumpTo(0)
        return
      case 'End':
        event.preventDefault()
        jumpTo(options.length - 1)
        return
      default:
        return
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <p id={id ? `${id}-label` : undefined} className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label={groupAriaLabel}
        aria-labelledby={id && label ? `${id}-label` : undefined}
        onKeyDown={handleKeyDown}
        // P1-1 fix: `flex flex-wrap` instead of `inline-flex` so options wrap
        // to the next line when the track is wider than the panel column
        // (~360px). Without wrap, options clip silently.
        className="flex flex-wrap items-center gap-0.5 rounded-md bg-secondary/40 p-0.5"
      >
        {options.map((option, index) => (
          <SegmentedOption
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            option={option}
            selected={option.value === value}
            // Roving tabindex: selected option is in the tab order; others are
            // out. If nothing matches (selectedIndex === -1), make the first
            // option focusable so the group is still reachable via Tab.
            tabIndex={
              option.value === value || (selectedIndex === -1 && index === 0) ? 0 : -1
            }
            onSelect={() => {
              onChange(option.value)
              focusOption(index)
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface SegmentedOptionProps<T extends string> {
  option: SegmentedControlOption<T>
  selected: boolean
  tabIndex: number
  onSelect: () => void
  ref: (el: HTMLButtonElement | null) => void
}

function SegmentedOption<T extends string>({
  option,
  selected,
  tabIndex,
  onSelect,
  ref,
}: SegmentedOptionProps<T>) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      className={cn(
        // P2-3: `rounded` (theme scale = 4px) instead of off-scale `rounded-[5px]`.
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
        selected
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {option.icon ? <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{option.icon}</span> : null}
      <span>{option.label}</span>
    </button>
  )
}
