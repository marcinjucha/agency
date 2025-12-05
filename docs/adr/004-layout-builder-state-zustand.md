# ADR-004: Layout Builder State Management with Zustand

**Status:** Accepted
**Date:** 2025-01-22
**Decision Makers:** Architecture Team
**Tags:** #layout-builder #state-management #zustand #performance

---

## Context

The Layout Builder is a complex drag-and-drop editor that requires managing:
- **Component tree** - Nested components with props and styles
- **Selected component** - Currently selected for editing
- **Undo/Redo** - History of layout changes
- **Breakpoint state** - Desktop/Tablet/Mobile views
- **Dirty state** - Unsaved changes indicator

### Requirements

1. **Performance** - 60fps drag & drop, no jank
2. **Developer Experience** - Easy to use, minimal boilerplate
3. **Time-travel debugging** - Undo/Redo support
4. **Type Safety** - Full TypeScript support
5. **Testability** - Easy to unit test
6. **Bundle Size** - Keep under 10KB for state library

### Constraints

- Must work with Next.js 15 App Router
- Must integrate with @dnd-kit drag & drop
- Must support Server Components where possible
- React 19 compatible

## Decision

**We will use Zustand for Layout Builder state management.**

### Architecture

```typescript
// lib/stores/layout-builder-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface LayoutBuilderState {
  // State
  layoutData: LayoutData;
  selectedComponentId: string | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  history: LayoutData[];
  historyIndex: number;
  isDirty: boolean;

  // Actions
  setLayoutData: (data: LayoutData) => void;
  selectComponent: (id: string | null) => void;
  setBreakpoint: (breakpoint: Breakpoint) => void;
  updateComponent: (id: string, updates: Partial<ComponentTree>) => void;
  deleteComponent: (id: string) => void;
  addComponent: (parentId: string, component: ComponentTree) => void;
  moveComponent: (componentId: string, newParentId: string, index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  save: () => Promise<void>;
}

export const useLayoutBuilder = create<LayoutBuilderState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      layoutData: createEmptyLayout(),
      selectedComponentId: null,
      breakpoint: 'desktop',
      history: [],
      historyIndex: -1,
      isDirty: false,

      // Actions
      setLayoutData: (data) => {
        set((state) => {
          state.layoutData = data;
          // Add to history
          state.history.push(JSON.parse(JSON.stringify(data)));
          state.historyIndex = state.history.length - 1;
          state.isDirty = true;
        });
      },

      selectComponent: (id) => {
        set({ selectedComponentId: id });
      },

      setBreakpoint: (breakpoint) => {
        set({ breakpoint });
      },

      updateComponent: (id, updates) => {
        set((state) => {
          const node = findNodeById(state.layoutData, id);
          if (node) {
            Object.assign(node, updates);
            state.isDirty = true;
          }
        });
      },

      // ... more actions
    }))
  )
);
```

### Usage in Components

```typescript
// components/layout-builder/Canvas.tsx
'use client'

export function Canvas() {
  const layoutData = useLayoutBuilder(state => state.layoutData);
  const breakpoint = useLayoutBuilder(state => state.breakpoint);
  const updateComponent = useLayoutBuilder(state => state.updateComponent);

  return (
    <div className="canvas">
      <ComponentRenderer
        node={layoutData.breakpoints[breakpoint]}
        onUpdate={updateComponent}
      />
    </div>
  );
}
```

### Alternatives Considered

#### Alternative 1: Redux Toolkit

```typescript
// Redux approach
import { configureStore, createSlice } from '@reduxjs/toolkit';

const layoutSlice = createSlice({
  name: 'layout',
  initialState: { layoutData: {}, selectedComponentId: null },
  reducers: {
    updateComponent: (state, action) => {
      // immutable update logic
    }
  }
});
```

**Pros:**
✅ Industry standard
✅ Excellent DevTools
✅ Mature ecosystem

**Cons:**
❌ **Boilerplate** - Actions, reducers, selectors
❌ **Bundle size** - 40KB+ (Redux + RTK + React-Redux)
❌ **Learning curve** - Steeper for team
❌ **Overkill** - Too much for component state

**Decision: Rejected** - Too heavy for this use case

#### Alternative 2: Jotai (Atomic State)

```typescript
// Jotai approach
import { atom, useAtom } from 'jotai';

const layoutDataAtom = atom<LayoutData>(createEmptyLayout());
const selectedComponentAtom = atom<string | null>(null);

export function Canvas() {
  const [layoutData, setLayoutData] = useAtom(layoutDataAtom);
  const [selectedId, selectComponent] = useAtom(selectedComponentAtom);
  // ...
}
```

**Pros:**
✅ Minimal boilerplate
✅ Small bundle (3KB)
✅ Great TypeScript support

**Cons:**
❌ **Atom hell** - Many atoms for complex state
❌ **Derived state complexity** - Need computed atoms
❌ **Less mature** - Smaller ecosystem than Zustand/Redux

**Decision: Rejected** - Better for simple state, Layout Builder is complex

#### Alternative 3: React Context + useReducer

```typescript
// Context approach
const LayoutBuilderContext = createContext<LayoutBuilderState | null>(null);

export function LayoutBuilderProvider({ children }) {
  const [state, dispatch] = useReducer(layoutReducer, initialState);

  return (
    <LayoutBuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </LayoutBuilderContext.Provider>
  );
}
```

**Pros:**
✅ Built-in to React
✅ No extra dependencies
✅ Simple for small state

**Cons:**
❌ **Performance** - Re-renders entire tree on state change
❌ **No DevTools** - Hard to debug
❌ **Verbose** - Need actions, reducer, context, provider
❌ **No middleware** - No undo/redo, persistence out of the box

**Decision: Rejected** - Performance issues at scale

#### Alternative 4: MobX

```typescript
// MobX approach
import { makeAutoObservable } from 'mobx';

class LayoutBuilderStore {
  layoutData: LayoutData = createEmptyLayout();
  selectedComponentId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  updateComponent(id: string, updates: Partial<ComponentTree>) {
    const node = findNodeById(this.layoutData, id);
    Object.assign(node, updates);
  }
}
```

**Pros:**
✅ Simple mutations (no immutability)
✅ Automatic dependency tracking
✅ Good performance

**Cons:**
❌ **Mutable by default** - Can cause bugs
❌ **Magic** - Hard to trace state changes
❌ **Bundle size** - 16KB
❌ **Less popular** - Smaller community

**Decision: Rejected** - Prefer explicit over magic

## Rationale

### Why Zustand Wins

✅ **Minimal Boilerplate**
```typescript
// Zustand: ~20 lines
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

// Redux: ~40 lines
const slice = createSlice({ /* ... */ });
const store = configureStore({ /* ... */ });
const Provider = <Provider store={store}>...</Provider>;
```

✅ **Small Bundle Size**
- Zustand: **1.1KB** (gzipped)
- Redux Toolkit: **40KB** (gzipped)
- MobX: **16KB** (gzipped)
- Jotai: **3KB** (gzipped)

Winner: Zustand (smallest full-featured solution)

✅ **Performance**
```typescript
// Selector optimization (prevents re-renders)
const layoutData = useLayoutBuilder(state => state.layoutData);
const selectedId = useLayoutBuilder(state => state.selectedComponentId);

// Only re-renders when selectedId changes, not layoutData
```

✅ **DevTools Built-in**
```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set, get) => ({
    // ... store
  }))
);
```

✅ **Middleware Ecosystem**
```typescript
import { persist } from 'zustand/middleware';

// Auto-persist to localStorage
const useStore = create(
  persist(
    (set, get) => ({ /* ... */ }),
    { name: 'layout-builder-storage' }
  )
);
```

✅ **TypeScript First-Class**
```typescript
// Full type inference
const updateComponent = useLayoutBuilder(state => state.updateComponent);
// updateComponent is correctly typed: (id: string, updates: Partial<ComponentTree>) => void
```

✅ **No Provider Needed**
```typescript
// Redux/Context: Need Provider wrapper
<Provider>
  <LayoutBuilder />
</Provider>

// Zustand: Just use the hook
<LayoutBuilder />
```

✅ **Easy Testing**
```typescript
import { useLayoutBuilder } from './store';

// Test store directly
const store = useLayoutBuilder.getState();
store.updateComponent('hero-1', { title: 'New Title' });
expect(store.layoutData.components['hero-1'].props.title).toBe('New Title');
```

## Implementation Plan

### Phase 1: Setup Store (Week 4, Day 1)

1. **Install dependencies**
```bash
npm install zustand immer
npm install -D @types/node
```

2. **Create store structure**
```
lib/
└── stores/
    ├── layout-builder-store.ts      # Main store
    ├── layout-builder-store.test.ts # Unit tests
    └── types.ts                      # Store types
```

3. **Create base store**
```typescript
// lib/stores/layout-builder-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useLayoutBuilder = create<LayoutBuilderState>()(
  devtools(
    immer((set, get) => ({
      layoutData: createEmptyLayout(),
      selectedComponentId: null,
      breakpoint: 'desktop',
      history: [],
      historyIndex: -1,
      isDirty: false,

      // Actions implementation...
    })),
    { name: 'LayoutBuilder' }
  )
);
```

### Phase 2: Implement Core Actions (Week 4, Day 2-3)

```typescript
// CRUD operations
updateComponent: (id, updates) => {
  set((state) => {
    const node = findNodeById(state.layoutData, id);
    if (node) {
      Object.assign(node, updates);
      state.isDirty = true;
      pushToHistory(state);
    }
  });
},

addComponent: (parentId, component) => {
  set((state) => {
    const parent = findNodeById(state.layoutData, parentId);
    if (parent) {
      parent.children.push(component);
      state.isDirty = true;
      pushToHistory(state);
    }
  });
},

deleteComponent: (id) => {
  set((state) => {
    const parent = findParentOfNode(state.layoutData, id);
    if (parent) {
      parent.children = parent.children.filter(child => child.id !== id);
      state.isDirty = true;
      pushToHistory(state);
    }
  });
},
```

### Phase 3: Undo/Redo (Week 4, Day 4)

```typescript
// History management
const MAX_HISTORY = 50;

function pushToHistory(state: LayoutBuilderState) {
  // Remove future history if we're not at the end
  state.history = state.history.slice(0, state.historyIndex + 1);

  // Add current state to history
  state.history.push(JSON.parse(JSON.stringify(state.layoutData)));

  // Limit history size
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }
}

undo: () => {
  set((state) => {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      state.layoutData = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      state.isDirty = true;
    }
  });
},

redo: () => {
  set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      state.layoutData = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      state.isDirty = true;
    }
  });
},
```

### Phase 4: Persistence (Week 4, Day 5)

```typescript
// Auto-save to backend
save: async () => {
  const { layoutData, isDirty } = get();

  if (!isDirty) return;

  try {
    await updatePageLayout(layoutData);

    set({ isDirty: false });

    toast.success('Layout saved');
  } catch (error) {
    toast.error('Failed to save layout');
    throw error;
  }
},

// Auto-save with debounce
const debouncedSave = debounce(() => {
  useLayoutBuilder.getState().save();
}, 2000);

// Call after each mutation
updateComponent: (id, updates) => {
  set(/* ... */);
  debouncedSave();
},
```

### Phase 5: Performance Optimizations (Week 5)

**1. Selector Optimization**
```typescript
// BAD: Re-renders on any state change
const store = useLayoutBuilder();

// GOOD: Only re-renders when layoutData changes
const layoutData = useLayoutBuilder(state => state.layoutData);

// BETTER: Only re-renders when specific component changes
const heroComponent = useLayoutBuilder(state =>
  findNodeById(state.layoutData, 'hero-1')
);
```

**2. Shallow Equality**
```typescript
import { shallow } from 'zustand/shallow';

// Only re-renders if array contents change
const [layoutData, breakpoint] = useLayoutBuilder(
  state => [state.layoutData, state.breakpoint],
  shallow
);
```

**3. Computed Values**
```typescript
// Memoize expensive computations
const canUndo = useLayoutBuilder(state => state.historyIndex > 0);
const canRedo = useLayoutBuilder(state => state.historyIndex < state.history.length - 1);
```

**4. Large Lists**
```typescript
// For component palette with 50+ components
import { useVirtualizer } from '@tanstack/react-virtual';

const components = useLayoutBuilder(state => state.availableComponents);
const virtualizer = useVirtualizer({
  count: components.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});
```

## Integration with Layout Builder

### Canvas Component
```typescript
// components/layout-builder/Canvas.tsx
'use client'

import { useLayoutBuilder } from '@/lib/stores/layout-builder-store';
import { DndContext, DragEndEvent } from '@dnd-kit/core';

export function Canvas() {
  const layoutData = useLayoutBuilder(state => state.layoutData);
  const breakpoint = useLayoutBuilder(state => state.breakpoint);
  const moveComponent = useLayoutBuilder(state => state.moveComponent);
  const selectedId = useLayoutBuilder(state => state.selectedComponentId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      moveComponent(active.id as string, over.id as string, 0);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <ComponentRenderer
        node={layoutData.breakpoints[breakpoint]}
        selectedId={selectedId}
      />
    </DndContext>
  );
}
```

### Property Editor
```typescript
// components/layout-builder/PropertyEditor.tsx
'use client'

import { useLayoutBuilder } from '@/lib/stores/layout-builder-store';

export function PropertyEditor() {
  const selectedId = useLayoutBuilder(state => state.selectedComponentId);
  const updateComponent = useLayoutBuilder(state => state.updateComponent);

  const selectedComponent = useLayoutBuilder(state =>
    selectedId ? findNodeById(state.layoutData, selectedId) : null
  );

  if (!selectedComponent) return <div>Select a component</div>;

  return (
    <Form
      initialValues={selectedComponent.props}
      onSubmit={(values) => updateComponent(selectedId!, { props: values })}
    />
  );
}
```

### Toolbar
```typescript
// components/layout-builder/Toolbar.tsx
'use client'

import { useLayoutBuilder } from '@/lib/stores/layout-builder-store';

export function Toolbar() {
  const undo = useLayoutBuilder(state => state.undo);
  const redo = useLayoutBuilder(state => state.redo);
  const canUndo = useLayoutBuilder(state => state.historyIndex > 0);
  const canRedo = useLayoutBuilder(state => state.historyIndex < state.history.length - 1);
  const save = useLayoutBuilder(state => state.save);
  const isDirty = useLayoutBuilder(state => state.isDirty);

  return (
    <div className="toolbar">
      <Button onClick={undo} disabled={!canUndo}>Undo</Button>
      <Button onClick={redo} disabled={!canRedo}>Redo</Button>
      <Button onClick={save} disabled={!isDirty}>Save</Button>
    </div>
  );
}
```

## Testing Strategy

```typescript
// lib/stores/layout-builder-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutBuilder } from './layout-builder-store';

describe('LayoutBuilderStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useLayoutBuilder.setState(createEmptyLayout());
  });

  it('should update component', () => {
    const { updateComponent, layoutData } = useLayoutBuilder.getState();

    updateComponent('hero-1', { props: { title: 'New Title' } });

    const hero = findNodeById(layoutData, 'hero-1');
    expect(hero?.props.title).toBe('New Title');
  });

  it('should handle undo/redo', () => {
    const { updateComponent, undo, redo, layoutData } = useLayoutBuilder.getState();

    const initialTitle = findNodeById(layoutData, 'hero-1')?.props.title;

    updateComponent('hero-1', { props: { title: 'Changed' } });
    expect(findNodeById(layoutData, 'hero-1')?.props.title).toBe('Changed');

    undo();
    expect(findNodeById(layoutData, 'hero-1')?.props.title).toBe(initialTitle);

    redo();
    expect(findNodeById(layoutData, 'hero-1')?.props.title).toBe('Changed');
  });

  it('should mark state as dirty on changes', () => {
    const { updateComponent, isDirty } = useLayoutBuilder.getState();

    expect(isDirty).toBe(false);

    updateComponent('hero-1', { props: { title: 'Changed' } });

    expect(useLayoutBuilder.getState().isDirty).toBe(true);
  });
});
```

## Consequences

### Positive

✅ **Minimal boilerplate** - 70% less code than Redux
✅ **Best performance** - Selector-based re-renders
✅ **Small bundle** - Only 1.1KB overhead
✅ **Great DX** - Simple API, TypeScript support, DevTools
✅ **Easy testing** - Direct store access in tests
✅ **No provider** - Works with Server Components better

### Negative

⚠️ **Less mature** than Redux - Smaller ecosystem
  - *Mitigation:* Zustand has 40k+ GitHub stars, stable API

⚠️ **Manual history management** - No built-in undo/redo
  - *Mitigation:* Easy to implement (see Phase 3)

⚠️ **Global state** - Shared across components
  - *Mitigation:* Fine for Layout Builder (single instance)

### Neutral

ℹ️ **Learning curve** - Team needs to learn Zustand
  - Mitigation: API is simpler than Redux

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand DevTools](https://github.com/pmndrs/zustand#devtools)
- [React State Management Comparison](https://leerob.io/blog/react-state-management)

## Related Decisions

- [ADR-003: Plugin System MVP Scope](./003-plugin-system-mvp-scope.md)
- [ADR-005: Caching Strategy](./005-caching-strategy.md)

---

**Last Updated:** 2025-01-22
**Reviewed By:** Architecture Team
