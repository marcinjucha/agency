# Landing Page Implementation Plan - Legal Hub

**Status:** Ready for Implementation
**Created:** 2026-01-08
**Target Duration:** 3-4 weeks (with 3 developers in parallel)
**Total Effort:** ~40-45 hours (optimized from 56h with parallelization)

---

## Executive Summary

Build a professional, conversion-focused landing page for Legal Hub using existing Next.js infrastructure, shadcn/ui components, and data-driven component architecture. The page will communicate key value propositions to Polish law firms through 9 sections:

1. **Navbar** - Navigation + brand
2. **Hero** - Main value prop + CTA
3. **Problems** - 6 pain points (grid: 1→2→3 cols)
4. **Benefits** - 6 key benefits with metrics
5. **Features** - 6 features overview
6. **How It Works** - 6-step workflow visualization
7. **Pricing** - 3-tier pricing table
8. **Testimonials** - Social proof (placeholder initially)
9. **FAQ + Final CTA** - Objection handling + conversion

**MVP Scope:** Focus on Sections 1-8 (Navbar→Testimonials). Section 9 (FAQ) is nice-to-have.

---

## Content Architecture (from Product-Idea.md)

### Hero
```
Headline: "5 dni → 15 minut. Automatyczny client intake dla polskich kancelarii."
Subheading: "Smart surveys + AI kwalifikacja + instant booking = 40% więcej klientów"
CTA Primary: "Zacznij demo"
CTA Secondary: "Dowiedz się więcej"
```

### Problems (6 items)
1. Przegapujesz 40-50% leadów (slow response)
2. 30 min konsultacji to 20 min zbierania faktów
3. 30-40% konsultacji to time-wasters
4. Umawianie spotkania = 3-5 email exchanges
5. Leadów z 24h nie trafiają do konkurencji
6. Zero danych = decyzje na czuja

### Benefits (6 items with metrics)
1. 3x szybszy intake (5 dni → 15 minut)
2. 40-50% więcej konsultacji (zero lead leakage)
3. 30% mniej zmarnowanych konsultacji (AI pre-screen)
4. 40h/m oszczędzone (no manual booking)
5. Data-driven decisions (complete visibility)
6. Professional first impression (competitive advantage)

### Features (6 items)
1. Smart Intake Forms (Drag-drop builder, 7 question types)
2. Shareable Public Links (Unique tokens, anonymous access)
3. AI-Powered Case Qualification (Webhook → AI analysis)
4. Google Calendar Integration (Auto booking)
5. Response Management (CMS dashboard)
6. Coming Soon - Email Automations

### How It Works (6-step workflow)
1. Client receives email with form link
2. Fills intake form (5 min)
3. AI analyzes (instant)
4. Lawyer reviews summary (5 min)
5. Client books appointment (2 min)
6. Confirmation sent (instant)

### Pricing (3 tiers)
- **Tier 1 (Startup):** 1,500 PLN setup + 400 PLN/m (100 responses/m)
- **Tier 2 (Professional):** 3,500 PLN setup + 800 PLN/m (500 responses/m) [FEATURED]
- **Tier 3 (Enterprise):** 6,000 PLN setup + 1,500 PLN/m (unlimited)

### FAQ (8 questions from objection handling)
1. Klienci wolą dzwonić, nie wypełniać formularze
2. AI może źle ocenić sprawę
3. Mamy już Calendly
4. To brzmi drogo
5. Jak bezpieczne są dane?
6. Jaki jest minimalny commitment?
7. Jak szybko mogę zacząć?
8. Jakie są next steps?

---

## Technical Architecture

### File Structure
```
apps/website/
├── app/(marketing)/
│   ├── layout.tsx                      # Shared navbar/footer layout
│   └── page.tsx                        # Homepage with all sections
│
└── features/marketing/
    ├── components/
    │   ├── Navbar.tsx
    │   ├── Hero.tsx
    │   ├── Problems.tsx                # Uses ProblemCard
    │   ├── Benefits.tsx                # Uses BenefitCard
    │   ├── Features.tsx                # Uses FeatureCard
    │   ├── HowItWorks.tsx              # Uses StepCard
    │   ├── Pricing.tsx                 # Uses PricingCard
    │   ├── Testimonials.tsx            # Uses TestimonialCard
    │   ├── FAQ.tsx                     # Optional (nice-to-have)
    │   ├── FinalCTA.tsx
    │   └── Footer.tsx
    │
    ├── data/
    │   ├── problems.ts
    │   ├── benefits.ts
    │   ├── features.ts
    │   ├── faqs.ts
    │   └── testimonials.ts
    │
    └── types.ts
```

### Component Reuse Strategy
- **ProblemCard** - Reusable card for each problem (icon + headline + description)
- **BenefitCard** - Reusable card for benefits (metric + explanation)
- **FeatureCard** - Reusable card for features (icon + name + description)
- **StepCard** - Reusable card for How It Works steps
- **PricingCard** - Reusable card for pricing tiers
- **TestimonialCard** - Reusable card for testimonials

### Styling
- Use existing shadcn/ui Card components
- Tailwind CSS grid layouts (1→2→3 columns responsive)
- Color scheme from existing globals.css (primary blue, gray tones)
- No additional dependencies needed

---

## Implementation Phases

### Phase 1: Foundation & Data (Days 1-2)
**Goal:** Set up file structure and data files

| Task | Time | Dependencies |
|------|------|--------------|
| Create (marketing) route group + layout | 1.5h | None |
| Create data files (problems, benefits, features, faqs, testimonials) | 2h | None |
| Create types.ts | 0.5h | None |
| Create root layout updates | 1h | None |

**Parallelization:** All tasks independent. 2 developers can work simultaneously.
**Deliverable:** File structure + data architecture ready

---

### Phase 2: Components - Reusable Cards (Days 2-3)
**Goal:** Build reusable card components and section wrappers

| Task | Time | Owner | Dependencies |
|------|------|-------|--------------|
| ProblemCard + Problems.tsx | 1.5h | Dev-A | data/problems.ts |
| BenefitCard + Benefits.tsx | 1.5h | Dev-B | data/benefits.ts |
| FeatureCard + Features.tsx | 1.5h | Dev-C | data/features.ts |
| PricingCard + Pricing.tsx | 1.5h | Dev-D | data pricing |
| TestimonialCard + Testimonials.tsx | 1h | Dev-A | data testimonials |

**Parallelization:** All tasks independent. 4 developers working in parallel.
**Build Check:** `npm run build:website` - Verify no TypeScript errors
**Deliverable:** 5 reusable card components + 5 section components

---

### Phase 3: Core Sections (Days 3-4)
**Goal:** Build remaining key sections

| Task | Time | Owner | Dependencies |
|------|------|-------|--------------|
| Navbar.tsx | 2h | Dev-A | Layout from Phase 1 |
| Hero.tsx | 1.5h | Dev-B | Layout, data |
| HowItWorks.tsx | 1.5h | Dev-C | Layout, data |
| Footer.tsx | 1.5h | Dev-D | Layout |
| FinalCTA.tsx | 1h | Dev-A | Layout |

**Parallelization:** Navbar independent, others independent. 4 developers working in parallel.
**Build Check:** `npm run build:website` - Verify all sections compile
**Deliverable:** All 9 main sections complete

---

### Phase 4: Integration & Optimization (Days 5-6)
**Goal:** Integrate all sections into homepage, optimize, test

| Task | Time | Owner |
|------|------|-------|
| Integrate into app/(marketing)/page.tsx | 1.5h | Dev-A |
| Add metadata + SEO (title, description, OG tags) | 1h | Dev-B |
| Responsive testing (mobile/tablet/desktop) | 3h | QA |
| Performance optimization (lazy load, images) | 2h | Dev-C |
| Content proofreading + Polish | 2h | Content |

**Build Checks:**
- `npm run build` - Both apps (website + cms) must succeed
- Lighthouse: >90 (desktop + mobile)
- Page load time: <2s on 4G mobile

**Deliverable:** Production-ready homepage

---

### Phase 5: Optional Enhancements (Days 6-7)
**Goal:** Add nice-to-have features if time permits

| Task | Time | Owner | Priority |
|------|------|-------|----------|
| FAQ.tsx with accordion | 1.5h | Dev-A | Nice-to-have |
| Dark mode support | 2h | Dev-B | Nice-to-have |
| Analytics tracking | 1.5h | Dev-C | Nice-to-have |
| Form submission handling (demo request) | 2h | Dev-D | Critical if added |

**Note:** These are optional. MVP is Phase 1-4 (8 sections without FAQ/forms).

---

## Execution Strategy (Optimized for Parallelization)

### Critical Path
```
Phase 1 (2 days) → Phase 2 (2 days) → Phase 3 (2 days) → Phase 4 (2 days) = 8 days total

With 3-4 developers:
- Days 1-2: Phase 1 (2 devs) + Phase 2 prep
- Days 3-4: Phase 2 (4 devs in parallel) - SAVES 1 day
- Days 5-6: Phase 3 (4 devs in parallel) - SAVES 1 day
- Days 7-8: Phase 4 (QA + optimization)

ACTUAL DURATION: 8-9 calendar days (vs 56h sequential = 14 days)
```

### Parallelization Opportunities

**Days 2-3 (Phase 2):** Launch 5 component pairs in parallel
- Dev-A: ProblemCard + Problems
- Dev-B: BenefitCard + Benefits
- Dev-C: FeatureCard + Features
- Dev-D: PricingCard + Pricing
- (All simultaneously, saves ~6 hours)

**Days 3-4 (Phase 3):** Launch 5 sections in parallel
- Dev-A: Navbar
- Dev-B: Hero
- Dev-C: HowItWorks
- Dev-D: Footer + FinalCTA
- (Saves ~4 hours)

**Result:** MVP landing page in 8-9 calendar days vs 14 days sequential

---

## Build Verification Checkpoints

### After Phase 2
```bash
npm run build:website
# Expected: ✓ Compiled successfully
# Check: No TypeScript errors, all imports resolve
```

### After Phase 3
```bash
npm run build
# Expected: ✓ Both apps compiled
# Check: website + cms build without errors
```

### After Phase 4
```bash
npm run build && npm run test:website
# Expected: Builds pass, Lighthouse >90, <2s load time
# Check: Mobile usability, accessibility, performance
```

---

## Manual Testing Checklist (After Phase 4)

### Mobile (iPhone 12 / Android)
- [ ] Hero section loads correctly
- [ ] Problems grid stacks vertically (1 column)
- [ ] Benefits display properly (no overflow)
- [ ] Pricing cards stack (1 per row)
- [ ] Testimonials are readable
- [ ] All CTAs clickable and functional
- [ ] No horizontal scroll
- [ ] Font sizes readable (≥16px)

### Tablet (iPad)
- [ ] Problems show 2 columns
- [ ] Pricing shows 2 columns + 1 row
- [ ] Navigation doesn't overflow
- [ ] Images load correctly

### Desktop (Chrome/Safari/Firefox)
- [ ] Problems show 3 columns
- [ ] Pricing shows 3 columns
- [ ] All sections properly spaced
- [ ] Page scrolls smoothly
- [ ] All links functional

### Accessibility
- [ ] Tab order makes sense
- [ ] All images have alt text
- [ ] Color contrast >4.5:1
- [ ] Forms are keyboard accessible
- [ ] Screen reader friendly (Lighthouse ≥95)

### Performance
- [ ] Page load time <2s (Google PageSpeed)
- [ ] Lighthouse score ≥90 (all categories)
- [ ] Images optimized (using next/image)
- [ ] No console errors/warnings

---

## Acceptance Criteria (MVP Definition)

### Must Have (Days 1-6)
- [x] Navbar with navigation links + demo CTA
- [x] Hero section with headline + 2 CTAs
- [x] Problems section (6 items in grid)
- [x] Benefits section (6 items with metrics)
- [x] Features section (6 items in grid)
- [x] How It Works (6-step workflow)
- [x] Pricing section (3 tiers, Professional highlighted)
- [x] Testimonials section (3-4 placeholders)
- [x] Footer with links + copyright
- [x] Mobile responsive (1→2→3 column grids)
- [x] SEO metadata (title, description, OG)
- [x] Lighthouse >90 (desktop + mobile)
- [x] No console errors

### Nice to Have (If time permits, Day 7)
- [ ] FAQ section with accordion
- [ ] Dark mode support
- [ ] Analytics tracking (Google Analytics)
- [ ] Demo request form integration
- [ ] Newsletter signup (footer)
- [ ] Social media links functional

### Out of Scope (Phase 6+)
- Marketing automation workflows
- Lead qualification system
- Email automation (Phase 2)
- Mobile app
- Team collaboration features

---

## Timeline Summary

| Phase | Days | Effort | Deliverable |
|-------|------|--------|-------------|
| **Phase 1: Foundation** | 2 | 5h | File structure + data |
| **Phase 2: Components** | 1.5 | 8h | 5 card component pairs |
| **Phase 3: Core Sections** | 1.5 | 7h | 5 key sections |
| **Phase 4: Integration** | 2 | 11h | Production-ready page |
| **Phase 5: Optional** | 1 | 7h | FAQ, dark mode, etc |
| **MVP TOTAL** | **8-9 days** | **31h** | **Working landing page** |

**Team:** 3-4 developers
**Cost:** ~€1,240 - €1,550 (at €40/h, 31-39h)

---

## Critical Success Factors

1. **Parallelization:** Don't build components sequentially - launch all 4 developers simultaneously on Phase 2
2. **Build verification:** Check TypeScript after each phase to catch errors early
3. **Data first:** Create all data files in Phase 1 before any component work
4. **Mobile first:** Test on mobile throughout development, not at the end
5. **No scope creep:** Keep MVP to 8 sections. FAQ/forms are Phase 2.
6. **Reusable components:** Extract ProblemCard, BenefitCard, etc. to avoid duplication
7. **Accessibility:** Add ARIA labels and semantic HTML from the start (not an afterthought)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Design inconsistency | Medium | Medium | Use design system strict rules |
| Mobile layout breaks | High | High | Test on mobile during Phase 2 |
| TypeScript errors slow down | Medium | Medium | Run build after each phase |
| Performance issues (Lighthouse <90) | Medium | Medium | Lazy load below-fold sections |
| Missing content from Product-Idea | Low | Medium | Use provided content verbatim |
| Integration issues in Phase 4 | Medium | Medium | Component tests during Phase 2-3 |

---

## Next Steps (Immediate Actions)

1. **Approve this plan** - Confirm 8-9 day timeline is acceptable
2. **Assign developers** - Need 3-4 developers (can be solo by 1 person, takes 3+ weeks)
3. **Create Vercel preview** - Deploy to preview environment for testing
4. **Set up demo CTA** - Define where "Zacznij demo" button should point (form/calendly)
5. **Gather real testimonials** (if available) - Otherwise use placeholders
6. **Start Phase 1** - Create file structure and data files

---

## Success Metrics (Post-Launch)

- Page load time: <2s (4G mobile)
- Lighthouse score: ≥90 (all metrics)
- Mobile usability: No layout issues
- CTA conversion: Track clicks to demo/contact
- Bounce rate: <45%
- Time on page: >2 minutes

---

**Plan Version:** 1.0
**Last Updated:** 2026-01-08
**Status:** Ready for Implementation Kickoff
