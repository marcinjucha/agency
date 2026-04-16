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
