# UI/UX Improvements - Implementation Checklist

**Status:** 🚧 In Progress (Sprint 1 & 2 Complete)
**Started:** 2026-01-20
**Last Updated:** 2026-01-20
**Priority:** Accessibility > Consistency > Component Library > Polish

## 📊 Progress Summary

### ✅ Completed (Sprint 1 & 2)
- **Sprint 1: Accessibility Critical Path** - 100% Complete
  - Semantic HTML table structures (AppointmentList, ResponseList)
  - ARIA labels audit (already compliant)
  - Keyboard focus management (skip-to-content link)
  - Live regions for screen readers
  - Accessible Dialog component (replaced window.confirm)

- **Sprint 2: Design System Foundation** - 90% Complete
  - shadcn/ui component library verified and exported
  - Centralized status color utilities (3 functions, 4 files updated)
  - Emoji audit (none found - all Lucide icons)
  - Spacing audit completed (7 files identified for future cleanup)

### 📝 New Documentation Created
- **docs/design-system.md** - Single source of truth for UI/UX patterns
  - Component library reference
  - Spacing, typography, color standards
  - Accessibility guidelines
  - Responsive design patterns
  - Updated ui-ux-designer agent to reference this doc

### 🔄 Remaining Work
- Sprint 3: Component Library (LoadingState, ErrorState, EmptyState)
- Sprint 4: Responsive Design & Visual Polish
- Spacing scale bulk refactor (7 files)
- Native form element replacement (SurveyBuilder, CalendarSettings)

---

## Sprint 1: Accessibility Critical Path (HIGH PRIORITY) ✅ COMPLETED

**Goal:** WCAG 2.1 AA compliance for core functionality

### 1.1 Semantic Table Structure ✅
- [x] Convert AppointmentList to semantic `<table>` structure
  - [x] Replace `grid grid-cols-12` with `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
  - [x] Add `aria-label="Appointments list"` to table
  - [x] Add `scope="col"` to column headers
  - [x] Wrap in `overflow-x-auto` for responsive scrolling
  - [x] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`
- [x] Convert ResponseList to semantic `<table>` structure
  - [x] Same changes as AppointmentList
  - [x] File: `/apps/cms/features/responses/components/ResponseList.tsx`

### 1.2 ARIA Labels for Icon-Only Buttons ✅
- [x] Add ARIA labels to Sidebar navigation icons
  - [x] File: `/apps/cms/components/admin/Sidebar.tsx` (Already had visible text labels - no changes needed)
- [x] Add ARIA labels to SurveyBuilder delete buttons
  - [x] File: `/apps/cms/features/surveys/components/SurveyBuilder.tsx` (Already had aria-label="Delete question")
- [x] Audit AppointmentList action buttons for missing labels
  - [x] File: `/apps/cms/features/appointments/components/AppointmentList.tsx` (Already had aria-label="View response details")

### 1.3 Keyboard Focus Management ✅
- [x] Add skip-to-content link in admin layout
  - [x] Add before Sidebar with `sr-only` class that shows on focus
  - [x] Pattern: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>`
  - [x] File: `/apps/cms/app/admin/layout.tsx`
- [x] Add `id="main-content"` to main content area
- [x] Add `tabindex="-1"` for programmatic focus

### 1.4 Live Regions for Dynamic Updates ✅
- [x] Add live region to AppointmentList
  - [x] Pattern: `<div className="sr-only" aria-live="polite">{appointments?.length} appointments loaded</div>`
  - [x] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`
- [x] Add live region to ResponseList
  - [x] File: `/apps/cms/features/responses/components/ResponseList.tsx`

### 1.5 Replace window.confirm() with Accessible Dialog ✅
- [x] Add Dialog component to packages/ui
  - [x] Installed `@radix-ui/react-dialog` dependency
  - [x] Created `/packages/ui/src/components/ui/dialog.tsx`
  - [x] Export Dialog components from `/packages/ui/src/index.ts`
- [x] Search for `window.confirm` usage
  - [x] Found 1 usage in CalendarSettings.tsx
- [x] Replace window.confirm with Dialog component
  - [x] File: `/apps/cms/features/calendar/components/CalendarSettings.tsx`
  - [x] Added accessible confirmation dialog with focus trapping and ESC key support

---

## Sprint 2: Design System Foundation (MEDIUM-HIGH PRIORITY) ✅ MOSTLY COMPLETE

**Goal:** Standardize component usage, eliminate inline styling inconsistencies

### 2.1 Add Missing shadcn/ui Components ✅
- [x] Install shadcn/ui components
  - [x] Components already installed: select, textarea, checkbox, dialog
  - [ ] Toast component (skipped - CLI issues, not critical for MVP)
- [x] Export new components from `/packages/ui/src/index.ts`
  - [x] All components already exported (Select, Textarea, Checkbox, Dialog)
- [ ] Replace native form elements in SurveyBuilder (TODO: Future enhancement)
- [ ] Audit CalendarSettings for native form elements (TODO: Future enhancement)

### 2.2 Centralize Status Color Utilities ✅
- [x] Create status utility file
  - [x] File: `/apps/cms/lib/utils/status.ts` (created in Sprint 1)
  - [x] Implemented `getResponseStatusColor()`, `getAppointmentStatusColor()`, `getSurveyStatusColor()`
  - [x] Exported status types
- [x] All components now use centralized utility:
  - [x] AppointmentList
  - [x] ResponseDetail, ResponseList
  - [x] SurveyList

### 2.3 Remove Emoji, Standardize Icons ✅
- [x] Verify no emoji usage
  - [x] Searched entire CMS codebase - no emoji found in source files
  - [x] All icons use Lucide React library

### 2.4 Standardize Spacing Scale ⚠️ PARTIAL
- [x] Audited spacing inconsistencies
  - Found non-standard spacing in 7 files:
    - CalendarSettings.tsx (gap-3, p-3, mt-1)
    - AppointmentList.tsx (py-3, mt-1)
    - ResponseDetail.tsx (mb-3, mt-1, px-3)
    - ResponseList.tsx (py-3, mt-1, px-3)
    - SurveyLinks.tsx
    - SurveyList.tsx
    - SurveyBuilder.tsx
- [ ] Fix spacing to match pattern (TODO: Bulk refactor needed)
  - Standard scale documented in docs/design-system.md
  - Recommend: Dedicated spacing audit pass after Sprint 3

---

## Sprint 3: Component Library Expansion (MEDIUM PRIORITY)

**Goal:** Reduce code duplication with reusable components

### 3.1 Extract LoadingState Component
- [ ] Create LoadingState component
  - [ ] File: `/apps/cms/components/shared/LoadingState.tsx` (new)
  - [ ] Implement variants: `spinner`, `skeleton-table`, `skeleton-list`
  - [ ] Props: `variant`, `rows`, `message`
- [ ] Replace custom loading in SurveyList
  - [ ] Use `<LoadingState variant="spinner" />`
  - [ ] File: `/apps/cms/features/surveys/components/SurveyList.tsx`
- [ ] Replace custom loading in AppointmentList
  - [ ] Use `<LoadingState variant="skeleton-table" rows={5} />`
  - [ ] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`
- [ ] Replace custom loading in ResponseDetail
  - [ ] Use `<LoadingState variant="spinner" message="Loading response..." />`
  - [ ] File: `/apps/cms/features/responses/components/ResponseDetail.tsx`

### 3.2 Extract ErrorState Component
- [ ] Create ErrorState component
  - [ ] File: `/apps/cms/components/shared/ErrorState.tsx` (new)
  - [ ] Props: `title`, `message`, `onRetry`, `variant` (inline/card)
  - [ ] Include AlertCircle icon and retry button
- [ ] Replace custom error in SurveyList
  - [ ] Use `<ErrorState message={error.message} />`
  - [ ] File: `/apps/cms/features/surveys/components/SurveyList.tsx`
- [ ] Replace custom error in AppointmentList
  - [ ] Use `<ErrorState message={error.message} onRetry={refetch} />`
  - [ ] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`
- [ ] Replace custom error in ResponseDetail
  - [ ] Use `<ErrorState message={error.message} />`
  - [ ] File: `/apps/cms/features/responses/components/ResponseDetail.tsx`

### 3.3 Extract EmptyState Component
- [ ] Create EmptyState component
  - [ ] File: `/apps/cms/components/shared/EmptyState.tsx` (new)
  - [ ] Props: `icon`, `title`, `description`, `action` (ReactNode)
- [ ] Replace custom empty state in SurveyList
  - [ ] Use `<EmptyState icon={FileText} title="No surveys" ... />`
  - [ ] File: `/apps/cms/features/surveys/components/SurveyList.tsx`
- [ ] Replace custom empty state in AppointmentList
  - [ ] Use `<EmptyState icon={CalendarCheck} title="No appointments" ... />`
  - [ ] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`

---

## Sprint 4: Responsive Design & Visual Polish (LOW-MEDIUM PRIORITY)

**Goal:** Optimize mobile experience and improve visual consistency

### 4.1 Responsive Table Layouts
- [ ] Wrap AppointmentList table in responsive container
  - [ ] Add `<div className="overflow-x-auto">` wrapper
  - [ ] Consider mobile card layout: `<table className="hidden md:table">` + mobile cards
  - [ ] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`
- [ ] Wrap ResponseList table in responsive container
  - [ ] Same approach as AppointmentList
  - [ ] File: `/apps/cms/features/responses/components/ResponseList.tsx`

### 4.2 Touch Target Sizes
- [ ] Audit icon button sizes
  - [ ] Ensure all icon buttons are ≥ 44x44px
  - [ ] Pattern: `<Button variant="ghost" size="icon" className="p-2.5">`
- [ ] Fix SurveyBuilder delete buttons
  - [ ] File: `/apps/cms/features/surveys/components/SurveyBuilder.tsx`
- [ ] Fix AppointmentList action buttons
  - [ ] File: `/apps/cms/features/appointments/components/AppointmentList.tsx`

### 4.3 Fix Root Page Placeholder
- [ ] Replace Next.js template with redirect
  - [ ] Implement: `redirect('/admin')`
  - [ ] Or create simple landing page with login link
  - [ ] File: `/apps/cms/app/page.tsx`

### 4.4 Consistent Shadows, Typography, Borders
- [ ] Audit and fix shadow usage
  - [ ] Cards: `shadow-sm`
  - [ ] Hover: `hover:shadow-md`
  - [ ] Modals: `shadow-lg`
- [ ] Audit and fix typography hierarchy
  - [ ] Page titles: `text-3xl font-bold`
  - [ ] Section headings: `text-xl font-semibold`
  - [ ] Card headings: `text-lg font-semibold`
- [ ] Audit and fix border radius
  - [ ] Components: `rounded-lg`
  - [ ] Badges: `rounded-full`

---

## Verification & Testing (After Each Sprint)

### Accessibility Testing (Sprint 1)
- [ ] Run axe DevTools accessibility audit (0 critical issues) - **TODO: Manual testing required**
- [ ] Test with screen reader (VoiceOver on macOS or NVDA on Windows) - **TODO: Manual testing required**
- [ ] Test keyboard navigation (Tab, Enter, Escape, Arrow keys) - **TODO: Manual testing required**
- [x] Verify all interactive elements are keyboard accessible - **Code review complete**

### Responsive Testing (Sprint 1 & 2)
- [ ] Test on mobile device or DevTools (375px width) - **TODO: Manual testing required**
- [ ] Test on tablet (768px width) - **TODO: Manual testing required**
- [ ] Test on desktop (1024px+ width) - **TODO: Manual testing required**

### Design System Testing (Sprint 2)
- [ ] Verify all form elements use shadcn/ui components - **Partial: Native elements in SurveyBuilder**
- [x] Verify status badges use centralized utility - **Complete: 4 components updated**
- [x] Verify no emoji in codebase - **Complete: No emoji found**
- [ ] Check browser console for errors/warnings - **TODO: Manual testing required**

---

## Final Verification Checklist

### Accessibility (WCAG 2.1 AA)
- [x] All tables have semantic structure with proper roles (AppointmentList, ResponseList)
- [x] All icon-only buttons have aria-labels (audit complete - already compliant)
- [x] Skip-to-content link functional (admin layout)
- [x] Live regions announce updates (AppointmentList, ResponseList)
- [x] Dialog components trap focus and support ESC key (CalendarSettings)
- [x] All interactive elements keyboard accessible (verified)

### Design System Consistency
- [ ] 100% of form elements use shadcn/ui components (SurveyBuilder pending)
- [x] 100% of status badges use centralized utility (4 components updated)
- [x] No emoji in codebase (Lucide icons only) (verified)
- [ ] Consistent spacing scale (2, 4, 6, 8) (7 files pending bulk refactor)

### Component Library
- [ ] All loading states use LoadingState component
- [ ] All error states use ErrorState component
- [ ] All empty states use EmptyState component

### Responsive Design
- [ ] Tables scrollable or responsive on mobile (375px)
- [ ] Forms usable on tablet (768px)
- [ ] Touch targets ≥ 44x44px

### Visual Polish
- [ ] Consistent shadows (shadow-sm, shadow-md, shadow-lg)
- [ ] Clear typography hierarchy
- [ ] Consistent border radius
- [ ] Root page redirects or shows landing page

---

## Post-Implementation Review

After completing all sprints, use **ui-ux-designer agent** for final review:

- [ ] Review SurveyBuilder for design consistency
- [ ] Review shared components (LoadingState, ErrorState, EmptyState)
- [ ] Audit entire CMS app for visual consistency
- [ ] Suggest animation improvements
- [ ] Validate responsive design across breakpoints

---

## Notes

**Principles:**
- Signal vs noise - focus on holistic improvements
- Accessibility first - highest impact on usability
- DRY principle - eliminate duplication
- Core user journeys - survey creation, response viewing, appointments

**No Breaking Changes:**
- All changes are additive or refactoring
- No database schema changes
- No API changes
- No authentication changes

**Dependencies:**
- shadcn/ui components: `select`, `textarea`, `checkbox`, `dialog`, `toast`
- New utilities: status color utility
- New shared components: LoadingState, ErrorState, EmptyState

---

## 🎯 Implementation Log (2026-01-20)

### Sprint 1 Implementation Details

**Files Modified:**
1. `/apps/cms/features/appointments/components/AppointmentList.tsx`
   - Converted grid layout to semantic `<table>` with `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
   - Added `aria-label="Appointments list"`
   - Added `scope="col"` to all column headers
   - Added live region: `<div className="sr-only" aria-live="polite">`
   - Fixed TypeScript error with status type casting

2. `/apps/cms/features/responses/components/ResponseList.tsx`
   - Same semantic table improvements as AppointmentList
   - Added `aria-label="Responses list"`
   - Added live region for screen reader announcements

3. `/apps/cms/app/admin/layout.tsx`
   - Added skip-to-content link (keyboard accessible)
   - Added `id="main-content"` and `tabindex="-1"` to main element
   - Link styled with `sr-only focus:not-sr-only`

4. `/packages/ui/src/components/ui/dialog.tsx` (NEW)
   - Installed @radix-ui/react-dialog dependency
   - Created accessible Dialog component
   - Includes focus trapping and ESC key support

5. `/packages/ui/src/index.ts`
   - Exported all Dialog subcomponents

6. `/apps/cms/features/calendar/components/CalendarSettings.tsx`
   - Replaced `window.confirm()` with Dialog component
   - Added accessible confirmation dialog for Google Calendar disconnect

### Sprint 2 Implementation Details

**Files Created:**
1. `/docs/design-system.md` (NEW)
   - Comprehensive design system documentation
   - shadcn/ui component reference
   - Spacing scale (2, 4, 6, 8, 12, 16, 24, 32)
   - Typography hierarchy
   - Color palette and status colors
   - Accessibility standards (WCAG 2.1 AA)
   - Responsive breakpoints
   - Component patterns
   - Anti-patterns to avoid

**Files Modified:**
1. `/.claude/agents/ui-ux-designer.md`
   - Updated REFERENCE DOCUMENTATION to prioritize design-system.md
   - Updated CHECKLIST to reference design-system.md

**Audit Results:**
- shadcn/ui components: Select, Textarea, Checkbox, Dialog all installed and exported
- Toast component: Skipped due to CLI issues (not critical for MVP)
- Status utilities: Already centralized in `/apps/cms/lib/utils/status.ts` (created earlier)
- Emoji: None found in source files (all Lucide icons)
- Spacing inconsistencies: Identified 7 files with non-standard values (gap-3, p-3, mt-1, px-3, py-3, mb-3)

**Key Decisions:**
- Deferred native form element replacement to future enhancement (not critical path)
- Deferred spacing scale bulk refactor to dedicated pass (signal vs noise)
- Documented all patterns in design-system.md for consistency
- Toast component not critical for MVP, can add later if needed

### Files Pending Spacing Updates (Future Work)
1. CalendarSettings.tsx (gap-3, p-3, mt-1)
2. AppointmentList.tsx (py-3, mt-1)
3. ResponseDetail.tsx (mb-3, mt-1, px-3)
4. ResponseList.tsx (py-3, mt-1, px-3)
5. SurveyLinks.tsx
6. SurveyList.tsx
7. SurveyBuilder.tsx

**Recommendation:** Address spacing in dedicated bulk refactor pass after Sprint 3, using design-system.md as reference.
