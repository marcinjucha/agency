import type { Tables } from '@agency/database'

// --- Full folder row from DB ---

export type MediaFolder = Tables<'media_folders'>

// --- Tree node for nested folder display ---

export type FolderTreeNode = MediaFolder & { children: FolderTreeNode[] }

/**
 * Build a tree from a flat list of folders using parent_id references.
 * Root nodes have parent_id === null.
 */
export function buildFolderTree(folders: MediaFolder[]): FolderTreeNode[] {
  const nodeMap = new Map<string, FolderTreeNode>()

  // Create nodes with empty children arrays
  for (const folder of folders) {
    nodeMap.set(folder.id, { ...folder, children: [] })
  }

  const roots: FolderTreeNode[] = []

  for (const folder of folders) {
    const node = nodeMap.get(folder.id)!
    if (folder.parent_id === null) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(folder.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // Orphan — parent not in list, treat as root
        roots.push(node)
      }
    }
  }

  return roots
}
