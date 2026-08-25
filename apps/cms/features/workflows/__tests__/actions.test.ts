/**
 * Tests for workflows/actions.ts (Next.js Server Actions) were removed during
 * CMS TanStack Start migration (feature/cms-tanstack-migration).
 *
 * The functions previously tested here:
 *   createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflowActive,
 *   saveWorkflowCanvas, triggerManualWorkflow, createWorkflowFromTemplate,
 *   cancelWorkflowExecution
 *
 * have been ported to workflows/server.ts as TanStack Start server functions:
 *   createWorkflowFn, updateWorkflowFn, deleteWorkflowFn, toggleWorkflowActiveFn,
 *   saveWorkflowCanvasFn, triggerManualWorkflowFn, createWorkflowFromTemplateFn,
 *   cancelWorkflowExecutionFn
 *
 * New tests should cover server.ts functions using createServerFn mocking patterns.
 * actions.ts will be deleted once all consumers are migrated to server.ts.
 */

import { describe, it } from 'vitest'

// A file with only a comment makes vitest fail the run with "No test suite
// found". The note above is worth keeping, so it gets a real suite whose single
// entry is the outstanding work.
describe('workflows server functions (ported from actions.ts)', () => {
  it.todo('cover workflows/server.ts server functions with createServerFn mocks')
})
