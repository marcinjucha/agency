import { baseExtensions } from '../editor/extensions'

/**
 * Tiptap extensions for the shop product editor.
 * Simpler than blog — base extensions + image node (no video/embed).
 * Image is already in baseExtensions, so this re-exports as-is for now.
 * Future: add shop-specific nodes (product gallery, price card) here.
 */
export const shopEditorExtensions = [...baseExtensions]
