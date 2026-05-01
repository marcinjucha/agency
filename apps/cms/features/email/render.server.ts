// Server-only: imports @react-email/components which transitively pulls
// html-to-text (incompatible with Vite optimizer). Import Protection
// guarantees this file never enters client bundle.
export { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
