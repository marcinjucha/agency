# Tailwind v4 Setup

## Overview

Tailwind v4 uses CSS-based configuration with `@theme` directive for color definitions. Colors are defined with `--color-*` prefix and must be explicit values (not CSS variable references).

## Configuration Structure

### Light Mode (`@theme`)
```css
@theme {
  --color-primary: hsl(221.2 83.2% 53.3%);
  --color-destructive: hsl(0 72% 51%);
  --radius: 0.5rem;
}
```

### Dark Mode (Media Query)
```css
@media (prefers-color-scheme: dark) {
  @theme {
    --color-primary: hsl(217.2 91.2% 59.8%);
    --color-destructive: hsl(0 62.8% 30.6%);
  }
}
```

## File Structure

### apps/*/app/globals.css
```css
@import "tailwindcss";
@import "@agency/ui/styles.css";

@theme {
  --color-primary: hsl(...);
  --color-destructive: hsl(...);
  /* ... all colors ... */
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-primary: hsl(...);
    --color-destructive: hsl(...);
    /* ... dark mode colors ... */
  }
}
```

### packages/ui/src/styles.css
```css
@source "./";
```

Tells Tailwind v4 to scan this package for classes.

### packages/ui/package.json
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./styles.css": "./src/styles.css"
  }
}
```

## Usage Rules

### ✅ DO: Use Tailwind Classes
```tsx
<button className="bg-primary text-white hover:bg-primary/90 dark:bg-primary">
  Click me
</button>
```

### ❌ DON'T: Inline Styles
```tsx
// WRONG
<button style={{ backgroundColor: '#3f3cbb' }}>
  Click me
</button>
```

### ✅ DO: Define Colors with Full HSL Value
```css
@theme {
  --color-primary: hsl(221.2 83.2% 53.3%); /* Correct */
}
```

### ❌ DON'T: Use CSS Variable References in @theme
```css
@theme {
  --color-primary: var(--some-value); /* WRONG - Won't work */
}
```

## Color Values Format

Always use complete HSL format:
- `hsl(H S% L%)` - Spaces required
- Example: `hsl(221.2 83.2% 53.3%)`
- Do NOT use: `0 72% 51%` (missing `hsl()` wrapper)

## Utilities Generated

From `@theme` colors, Tailwind generates:
```css
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.border-primary { border-color: var(--color-primary); }
```

Dark mode variants work automatically:
```css
@media (prefers-color-scheme: dark) {
  .dark\:bg-primary { background-color: var(--color-primary); }
}
```

## Per-App Colors

Each app defines its own colors in `globals.css`:

**CMS:** `--color-destructive: hsl(0 72% 51%);` (darker red)
**Website:** `--color-destructive: hsl(0 84.2% 60.2%);` (lighter red)

The same component renders differently in each app.

## Component Guidelines

### DO
- Use only Tailwind classes from `@theme`
- Use `dark:` prefix for dark mode variants
- Group related styles with `cn()` utility

### DON'T
- Add inline `style={{ ... }}` attributes
- Use hardcoded hex colors
- Add custom CSS for simple styling

## Building

```bash
# Development
npm run dev:cms
npm run dev:website

# Production
npm run build --workspace=@agency/cms
npm run build --workspace=@agency/website
```

Cache is automatically managed. Clear with:
```bash
rm -rf apps/*/next
```

## Common Patterns

### Button Variants
```tsx
// From @agency/ui
<Button variant="primary">Primary</Button>
<Button variant="destructive" className="...">Delete</Button>
```

### Responsive Design
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">Content</div>
```

### Dark Mode
```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

## Resources

- Tailwind v4: https://tailwindcss.com/docs/v4-beta
- Dark Mode: https://tailwindcss.com/docs/dark-mode
- Theme Variables: https://tailwindcss.com/docs/theme
