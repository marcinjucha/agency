import * as React from "react"

import { cn } from "../../lib/utils"

const AUTO_RESIZE_MAX_HEIGHT = 200

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current
      if (!textarea) return
      textarea.style.height = "auto"
      const newHeight = Math.min(textarea.scrollHeight, AUTO_RESIZE_MAX_HEIGHT)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY =
        textarea.scrollHeight > AUTO_RESIZE_MAX_HEIGHT ? "auto" : "hidden"
    }, [])

    // Adjust on mount and when value changes externally (controlled component)
    React.useEffect(() => {
      if (autoResize) {
        adjustHeight()
      }
    }, [autoResize, adjustHeight, props.value])

    // Listen for DOM input event — works with both controlled and uncontrolled
    // (RHF register() sets value via ref, bypassing React onChange)
    React.useEffect(() => {
      if (!autoResize) return
      const textarea = internalRef.current
      if (!textarea) return
      const handler = () => adjustHeight()
      textarea.addEventListener("input", handler)
      return () => textarea.removeEventListener("input", handler)
    }, [autoResize, adjustHeight])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e)
      },
      [onChange]
    )

    // Merge external ref with internal ref
    const mergedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            node
        }
      },
      [ref]
    )

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={mergedRef}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
