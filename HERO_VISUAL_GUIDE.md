# Hero Section - Visual Guide

## Component Structure

```
<section> Hero Section
├── Background Decorations (2 animated circles)
│
└── max-w-7xl Container
    └── 2-Column Grid Layout
        │
        ├── Column 1 (Left) - Text Content (lg:col-span-1)
        │   ├── Headline
        │   │   └── "Zautomatyzuj"
        │   │   └── "przyjmowanie klientów" (gradient)
        │   │
        │   ├── Subheading
        │   │   └── "Oszczędzaj czas, zyskuj więcej klientów"
        │   │
        │   ├── Description Paragraph
        │   │   └── 3 sentences about Legal Hub benefits
        │   │
        │   ├── CTA Buttons Row
        │   │   ├── Primary Button (blue filled)
        │   │   │   └── "Zarezerwuj demo" + ArrowRight icon
        │   │   │
        │   │   └── Secondary Button (blue outline)
        │   │       └── "Dowiedz się więcej"
        │   │
        │   ├── Metrics Row (3 columns)
        │   │   ├── Metric 1: "500+" surveys
        │   │   ├── Metric 2: "10k+" responses
        │   │   └── Metric 3: "95%" conversion rate
        │   │
        │   └── Trust Badges (3 items)
        │       ├── Badge 1: "Bezpieczna autoryzacja Google Calendar"
        │       ├── Badge 2: "Szyfrowanie end-to-end dla danych klientów"
        │       └── Badge 3: "Bez zobowiązań, zrezygnuj w każdej chwili"
        │
        └── Column 2 (Right) - Hero Graphic (hidden on mobile)
            └── HeroGraphic Component
                ├── Background circles (gradient)
                ├── Document Card (bounce animation)
                ├── Calendar Element (pulse animation)
                ├── Automation Arrow (pulse animation)
                └── Floating Label (bounce animation)
```

## Visual Layout

### Desktop (1024px+)
```
┌─────────────────────────────────────────────────────────────┐
│                      Background Shapes                      │
├───────────────────────────────┬───────────────────────────────┤
│                               │                              │
│  Headline                     │                              │
│  "Zautomatyzuj..."            │                              │
│                               │     Hero SVG Graphic         │
│  Subheading                   │     (animated)               │
│  "Oszczędzaj czas..."         │                              │
│                               │                              │
│  Description paragraph...     │                              │
│  (3 sentences)                │                              │
│                               │                              │
│  [Primary] [Secondary]        │                              │
│                               │                              │
│  Metrics:                     │                              │
│  500+       10k+        95%    │                              │
│  surveys    responses   rate   │                              │
│                               │                              │
│  ✓ Security info              │                              │
│  ✓ More security              │                              │
│  ✓ Trust points               │                              │
│                               │                              │
└───────────────────────────────┴───────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌─────────────────────────────────────┐
│      Background Shapes              │
├──────────────────┬──────────────────┤
│                  │                  │
│  Headline        │  Hero Graphic    │
│  Subheading      │  (smaller)       │
│  Description     │                  │
│                  │                  │
│  [Button1]       │                  │
│  [Button2]       │                  │
│                  │                  │
│  Metrics:        │                  │
│  500+  10k+ 95%  │                  │
│                  │                  │
│  Trust badges    │                  │
├──────────────────┴──────────────────┤
│                                      │
│         Trust info section           │
│                                      │
└──────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────────────┐
│                              │
│    Background Shapes         │
│                              │
│    Headline                  │
│    "Zautomatyzuj..."         │
│                              │
│    Subheading                │
│    "Oszczędzaj czas..."      │
│                              │
│    Description paragraph     │
│    (3 sentences)             │
│                              │
│    ┌──────────────────────┐  │
│    │  [Primary Button]    │  │
│    └──────────────────────┘  │
│                              │
│    ┌──────────────────────┐  │
│    │ [Secondary Button]   │  │
│    └──────────────────────┘  │
│                              │
│    Metrics:                  │
│    500+                      │
│    surveys                   │
│                              │
│    10k+                      │
│    responses                 │
│                              │
│    95%                       │
│    conversion rate           │
│                              │
│    ✓ Security info           │
│    ✓ More security           │
│    ✓ Trust points            │
│                              │
│  (Hero graphic hidden)       │
│                              │
└──────────────────────────────┘
```

## Color Palette

### Background
- Primary: `bg-gradient-to-br from-blue-50 via-white to-blue-50`
- Decorative shapes: `bg-blue-100 opacity-10`

### Text
- Headline: `text-gray-900` (dark)
- Subheading: `text-gray-700` (medium-dark)
- Description: `text-gray-600` (medium)
- Secondary: `text-gray-500` (light)

### Accents
- Gradient text: `from-blue-600 to-blue-700`
- Primary button: `bg-blue-600 hover:bg-blue-700`
- Secondary button: `border-blue-600 text-blue-600`
- Trust icons: `text-green-500`
- Metrics: `text-blue-600` (2xl font)

## Typography

### Headline
- Size: `text-4xl sm:text-5xl lg:text-6xl`
- Weight: `font-bold`
- Line height: `leading-tight`
- Margin: `mb-6`

### Subheading
- Size: `text-xl sm:text-2xl`
- Weight: `font-semibold`
- Color: `text-gray-700`
- Margin: `mb-4`

### Description
- Size: `text-lg`
- Weight: normal
- Color: `text-gray-600`
- Line height: `leading-relaxed`
- Margin: `mb-8`

### Metrics
- Metric value: `text-2xl sm:text-3xl font-bold text-blue-600`
- Metric label: `text-sm text-gray-600`

### Button Text
- Size: `font-semibold`
- Size variant: `size="lg"` (h-10, px-8)

## Animations

### Entry Animations
- **Left column:** `animate-in fade-in slide-in-from-left-4 duration-700`
- **Right column:** Same + `delay-100`

### SVG Animations
- **Document bounce:** 3-second continuous bounce
- **Calendar pulse:** 2-second continuous pulse
- **Arrow pulse:** 2.5-second continuous pulse
- **Label bounce:** Bounce with 0.5s animation delay

### Hover Effects
- **Buttons:** Shadow transition
  - Primary: `shadow-lg hover:shadow-xl`
  - Secondary: Standard button hover

### Decorative Elements
- **Background circles:** `blur-3xl opacity-10`
- **Shapes:** Positioned absolutely, positioned top-right and bottom-left

## Responsive Breakpoints

```
Tailwind    Width       Classes Pattern
─────────────────────────────────────────
sm          640px       sm:
md          768px       md:
lg          1024px      lg:
xl          1280px      xl:
2xl         1536px      2xl:

Grid:
grid-cols-1               (mobile)
md:grid-cols-2            (tablet)
lg:grid-cols-2            (desktop)

Buttons:
flex-col                  (mobile, stacked)
sm:flex-row               (tablet+, side-by-side)
```

## Spacing

```
Section Padding:
- pt: py-20 → md:py-32 → lg:py-40
- pb: pb-20 → md:pb-32 → lg:pb-40
- px: px-4 → sm:px-6 → lg:px-8

Container:
- max-w-7xl mx-auto

Column Gap:
- gap-8 → lg:gap-16

Elements Gap:
- gap-8 (between major sections)
- gap-4 (buttons)
- gap-1, gap-2, gap-3 (small elements)

Margins:
- mb-6 (headline-subheading)
- mb-4 (subheading-description)
- mb-8 (description-buttons)
- mt-8, pt-8 (metrics separator)
- mt-4 (trust badges separator)
```

## Accessibility Features

✓ Semantic HTML: `<h1>`, `<p>`, `<section>`
✓ Proper heading hierarchy
✓ Color contrast WCAG AA+
✓ Icon alt text (`aria-hidden` for decorative)
✓ No keyboard barriers
✓ Touchable button sizes (min 44x44px on mobile)
✓ Screen reader friendly text
✓ Link `href` attributes on buttons

---

**Note:** This visual guide is for reference. Actual component implementation uses Tailwind CSS classes
and Next.js/React components as shown in Hero.tsx and HeroGraphic.tsx files.
