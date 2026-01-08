# Legal Hub Landing Page Components

## Summary

Two new reusable components have been created for the Legal Hub marketing landing page:

1. **StepCard.tsx** - Reusable card component for individual steps
2. **HowItWorks.tsx** - Complete 6-step workflow section

Both components are production-ready and follow the Legal Mind codebase patterns.

---

## Component 1: StepCard.tsx

### Location
```
apps/website/features/marketing/components/StepCard.tsx
```

### Purpose
Reusable card component for displaying individual steps in a workflow. Used by the HowItWorks component and can be reused elsewhere.

### Props
```typescript
interface StepCardProps {
  step: {
    id: string
    title: string
    description: string
  }
  stepNumber: number      // 1-6, displayed in numbered circle badge
  icon: IconName          // Type-safe icon name from types.ts
}
```

### Icon Support
All IconName types are mapped to lucide-react icons:
- `document` → FileText
- `clock` → Clock
- `users` → Users
- `zap` → Zap
- `shield` → Shield
- `target` → Target
- `check` → CheckCircle
- `chevron` → ChevronRight
- `star` → Star
- `heart` → Heart
- `scale` → Scale
- `briefcase` → Briefcase
- `hourglass` → Clock
- `messages` → MessageSquare

### Features
- Numbered circle badge in top-left corner
- Icon in rounded container with primary color
- Responsive design with hover shadow effect
- Accessibility: icons are aria-hidden, proper semantic HTML
- Uses shadcn/ui Card component from @legal-mind/ui
- Tailwind CSS styling
- Client component (`'use client'`)

### Usage Example
```tsx
import { StepCard } from '@/features/marketing/components/StepCard'

export function MySteps() {
  return (
    <StepCard
      step={{
        id: 'step-1',
        title: 'Create Intake Form',
        description: 'Build custom forms with 7 field types, conditional logic...'
      }}
      stepNumber={1}
      icon="document"
    />
  )
}
```

### Styling
- Card: `rounded-xl border shadow with hover effect`
- Badge: `primary background, positioned absolutely at top-left`
- Icon Container: `12x12 with rounded-lg background`
- Title: `text-lg font-semibold`
- Description: `text-sm muted-foreground`
- Responsive padding and sizing

---

## Component 2: HowItWorks.tsx

### Location
```
apps/website/features/marketing/components/HowItWorks.tsx
```

### Purpose
Complete section component rendering the 6-step Legal Hub client intake workflow. Intended to be embedded directly into the marketing homepage.

### The 6-Step Workflow
1. **Lawyer tworzy formularz** - Lawyer creates custom intake form
2. **Generuje unikalny link** - System generates shareable link
3. **Klient wypełnia formularz** - Client fills out form anonymously
4. **AI kwalifikuje sprawę** - AI analyzes and qualifies the case
5. **Klient rezerwuje wizytę** - Client books appointment from calendar
6. **Prawnik śledzi lead** - Lawyer has full context in CMS dashboard

### Features
- **Responsive Design:**
  - Mobile (< 768px): Vertical stack with connecting lines
  - Tablet (768px - 1024px): 2-column grid with lines
  - Desktop (> 1024px): Horizontal 6-column layout with SVG arrows

- **Connecting Elements:**
  - Mobile: Vertical lines between cards
  - Tablet: Grid layout with connecting lines
  - Desktop: SVG arrows between cards showing flow direction

- **Accessibility:**
  - Semantic HTML (section, h2, p)
  - Proper heading hierarchy
  - SVG arrows are `aria-hidden="true"`
  - Alt text on all visual elements

- **Design:**
  - Gradient background (from background to secondary/5)
  - Max-width container for readability
  - Clear heading and subheading
  - Call-to-action button at bottom
  - Polish language content

### Usage Example
```tsx
import { HowItWorks } from '@/features/marketing/components/HowItWorks'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Benefits />
      <HowItWorks />  {/* Insert section here */}
      <Pricing />
    </main>
  )
}
```

### Responsive Breakpoints
```
Mobile        < 768px    | md:hidden       (Vertical stack)
Tablet        768-1024px | hidden md:block lg:hidden (2 columns)
Desktop       > 1024px   | hidden lg:block (6 columns with arrows)
```

### SVG Arrows (Desktop Only)
- 3 arrows on top row (1→2, 2→3, 3→4)
- 3 arrows connecting to bottom row (4→5, 5→6)
- Animated arrows with direction indicator (polygon)
- Uses `currentColor` for theming support

### Styling
- Section: `py-16 px-4 sm:px-6 lg:px-8`
- Background: `bg-gradient-to-b from-background to-secondary/5`
- Container: `max-w-7xl mx-auto`
- Heading: `text-3xl sm:text-4xl lg:text-5xl font-bold`
- Subheading: `max-w-2xl centered text-muted-foreground`
- CTA Button: `primary background with hover effect`

### Accessibility Considerations
- SVG arrows use `aria-hidden="true"` (decorative)
- Semantic HTML structure
- Sufficient color contrast
- Focus-visible states on CTA button
- Keyboard navigable

---

## Integration Steps

### 1. Import and Use in Homepage
```tsx
// apps/website/app/(marketing)/page.tsx
import { HowItWorks } from '@/features/marketing/components/HowItWorks'

export default function HomePage() {
  return (
    <>
      {/* Other sections... */}
      <HowItWorks />
      {/* Other sections... */}
    </>
  )
}
```

### 2. Optional: Customize Step Data
The `WORKFLOW_STEPS` array is hardcoded in HowItWorks.tsx. To customize:

```tsx
// Option A: Edit directly in HowItWorks.tsx
const WORKFLOW_STEPS = [
  // Your custom steps here
]

// Option B: Create external data file (future)
// apps/website/features/marketing/data/steps.ts
import type { Step } from '../types'

export const WORKFLOW_STEPS: Step[] = [
  // Steps data
]

// Then import in HowItWorks.tsx
import { WORKFLOW_STEPS } from '../data/steps'
```

### 3. Optional: Move to Data File
If needed in future for other sections:

```tsx
// apps/website/features/marketing/data/steps.ts
import type { Step } from '../types'

export const WORKFLOW_STEPS: (Step & { icon: IconName })[] = [
  // Current step data from HowItWorks.tsx
]
```

---

## Type Definitions Used

### Step (from types.ts)
```typescript
interface Step {
  id: string              // Unique identifier
  number: number          // Step number (1-6)
  title: string          // Step title
  description: string    // Step description
}
```

### IconName (from types.ts)
```typescript
type IconName =
  | 'document'
  | 'clock'
  | 'users'
  | 'zap'
  | 'shield'
  | 'target'
  | 'check'
  | 'chevron'
  | 'star'
  | 'heart'
  | 'scale'
  | 'briefcase'
  | 'hourglass'
  | 'messages'
```

---

## Dependencies

### Imports
- `@legal-mind/ui` - Card, CardContent components
- `lucide-react` - Icon components (already installed)
- `../types` - Step and IconName type definitions

### No Additional Dependencies Needed
- All dependencies are already in the project
- Uses existing Tailwind CSS configuration
- Uses existing shadcn/ui components

---

## Styling Details

### Tailwind Classes Used
- Spacing: `p-6`, `py-16`, `mb-4`, `mb-12`, `-top-4`, `-left-4`
- Layout: `flex`, `grid`, `grid-cols-2`, `grid-cols-6`, `absolute`, `relative`
- Typography: `text-lg`, `text-sm`, `font-semibold`, `text-foreground`
- Colors: `bg-primary`, `text-primary-foreground`, `text-muted-foreground`
- Effects: `shadow`, `shadow-lg`, `hover:shadow-lg`, `transition-all`
- Responsive: `hidden`, `md:hidden`, `md:block`, `lg:hidden`, `lg:block`
- Sizing: `h-8`, `w-8`, `h-12`, `w-12`, `h-full`, `w-full`

### CSS Variables (Tailwind Theme)
- `bg-primary` / `text-primary-foreground` - Primary brand color
- `bg-secondary/5` - Subtle secondary background
- `text-foreground` / `text-muted-foreground` - Text colors

---

## Performance Considerations

### StepCard
- Pure functional component, no state
- Straightforward rendering, minimal re-renders
- Icon mapping is static (ICON_MAP constant)

### HowItWorks
- Static data (WORKFLOW_STEPS constant)
- SVG rendering only on desktop (hidden on mobile/tablet)
- Conditional rendering with Tailwind display utilities
- No data fetching or state management

---

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- SVG support for connecting arrows
- CSS variables (custom properties) support
- lucide-react icons work in all modern browsers

---

## Testing Suggestions

### Visual Testing
- Test on mobile, tablet, desktop breakpoints
- Verify step numbering displays correctly
- Check icon colors and sizing
- Verify connecting lines/arrows visibility
- Test hover effects on StepCard

### Accessibility Testing
- Screen reader testing (aria-hidden on decorative SVG)
- Keyboard navigation
- Color contrast verification
- Focus visible on CTA button

### Component Testing
```tsx
import { render, screen } from '@testing-library/react'
import { StepCard } from '@/features/marketing/components/StepCard'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'

describe('StepCard', () => {
  it('renders step number badge', () => {
    render(
      <StepCard
        step={{ id: 'test', title: 'Test', description: 'Test description' }}
        stepNumber={1}
        icon="document"
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders title and description', () => {
    render(
      <StepCard
        step={{ id: 'test', title: 'Test Title', description: 'Test Desc' }}
        stepNumber={1}
        icon="document"
      />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Desc')).toBeInTheDocument()
  })
})

describe('HowItWorks', () => {
  it('renders all 6 steps', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Lawyer tworzy formularz')).toBeInTheDocument()
    expect(screen.getByText('Prawnik śledzi lead')).toBeInTheDocument()
  })

  it('renders CTA button', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Rozpocznij bezpłatny test')).toBeInTheDocument()
  })
})
```

---

## Future Enhancements

### Potential Improvements
1. **Animation**: Add entrance animations (stagger reveal on scroll)
2. **Interactivity**: Make steps clickable to show detailed information
3. **Data Source**: Move to external data file for easier updates
4. **Variants**: Add different layout variants (horizontal vs vertical)
5. **Dark Mode**: Ensure proper contrast and styling in dark mode
6. **Video**: Add embedded video showing the workflow in action
7. **Progress Indicator**: Make it an interactive progress bar
8. **Internationalization**: Support multiple languages (Polish, English, etc.)

---

## Files Created

```
✅ /apps/website/features/marketing/components/StepCard.tsx     (116 lines)
✅ /apps/website/features/marketing/components/HowItWorks.tsx   (210 lines)
```

Both files follow the Legal Mind codebase conventions:
- TypeScript with proper type definitions
- Client components with `'use client'` directive
- JSDoc comments for documentation
- Tailwind CSS for styling
- shadcn/ui components
- Accessibility-first approach
- Polish language content (matching Product-Idea.md)

---

## Support

For questions or issues:
1. Check types.ts for available IconName values
2. Reference Product-Idea.md for workflow details
3. Review CLAUDE.md for codebase conventions
4. Check existing components in the same directory for patterns
