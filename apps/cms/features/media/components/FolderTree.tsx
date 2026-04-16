

import { useState, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@agency/ui'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Layers,
  FolderMinus,
} from 'lucide-react'
import type { FolderTreeNode } from '../folder-types'
import { messages } from '@/lib/messages'

type FolderTreeProps = {
  tree: FolderTreeNode[]
  selectedFolderId: string | null | undefined
  onSelectFolder: (id: string | null | undefined) => void
  onCreateFolder: (parentId?: string) => void
  onRenameFolder: (folder: FolderTreeNode) => void
  onDeleteFolder: (folder: FolderTreeNode) => void
  totalCount?: number
  unsortedCount?: number
}

type FolderNodeProps = {
  node: FolderTreeNode
  depth: number
  selectedFolderId: string | null | undefined
  onSelectFolder: (id: string) => void
  onCreateFolder: (parentId: string) => void
  onRenameFolder: (folder: FolderTreeNode) => void
  onDeleteFolder: (folder: FolderTreeNode) => void
}

function FolderNode({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedFolderId === node.id
  const FolderIcon = expanded && hasChildren ? FolderOpen : Folder

  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${node.id}`,
    data: { type: 'folder', folderId: node.id, folderName: node.name },
  })

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
      <div
        ref={setNodeRef}
        className={[
          'group flex items-center gap-1 rounded-md py-1.5 pr-1 text-sm cursor-pointer transition-colors',
          isSelected
            ? 'bg-accent/10 text-accent'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          isOver
            ? 'border border-dashed border-accent bg-accent/10 text-accent'
            : 'border border-transparent',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectFolder(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectFolder(node.id)
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={node.name}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="shrink-0 p-0.5 rounded hover:bg-muted/50"
            aria-label={expanded ? 'Zwiń' : 'Rozwiń'}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />

        <span className="flex-1 truncate">{node.name}</span>

        {/* Hover action buttons */}
        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCreateFolder(node.id)
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`${messages.media.createFolder} w ${node.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRenameFolder(node)
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`${messages.media.renameFolder} ${node.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteFolder(node)
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            aria-label={`${messages.media.deleteFolder} ${node.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree({
  tree,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  totalCount,
  unsortedCount,
}: FolderTreeProps) {
  const handleSelectAll = useCallback(() => onSelectFolder(undefined), [onSelectFolder])
  const handleSelectUnsorted = useCallback(() => onSelectFolder(null), [onSelectFolder])

  // "Bez folderu" is a droppable target (move to root / folder_id = null)
  const { isOver: isOverUnsorted, setNodeRef: setUnsortedRef } = useDroppable({
    id: 'folder-unsorted',
    data: { type: 'folder', folderId: null, folderName: messages.media.unsorted },
  })

  return (
    <nav
      className="w-60 shrink-0 rounded-lg border border-border bg-card/5 p-3"
      aria-label={messages.media.folders}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {messages.media.folders}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onCreateFolder()}
          aria-label={messages.media.createFolder}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Virtual folders */}
      <ul role="tree" className="space-y-0.5">
        {/* All media — NOT a drop target (it's a view, not a destination) */}
        <li role="treeitem" aria-selected={selectedFolderId === undefined}>
          <div
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors border border-transparent',
              selectedFolderId === undefined
                ? 'bg-accent/10 text-accent'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            ].join(' ')}
            onClick={handleSelectAll}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelectAll()
              }
            }}
            tabIndex={0}
            role="button"
          >
            <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{messages.media.allMedia}</span>
            {totalCount !== undefined && (
              <span className="text-xs text-muted-foreground">{totalCount}</span>
            )}
          </div>
        </li>

        {/* Unsorted — droppable (move to root) */}
        <li role="treeitem" aria-selected={selectedFolderId === null}>
          <div
            ref={setUnsortedRef}
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
              selectedFolderId === null
                ? 'bg-accent/10 text-accent'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              isOverUnsorted
                ? 'border border-dashed border-accent bg-accent/10 text-accent'
                : 'border border-transparent',
            ].join(' ')}
            onClick={handleSelectUnsorted}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelectUnsorted()
              }
            }}
            tabIndex={0}
            role="button"
          >
            <FolderMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{messages.media.unsorted}</span>
            {unsortedCount !== undefined && (
              <span className="text-xs text-muted-foreground">{unsortedCount}</span>
            )}
          </div>
        </li>

        {/* Folder tree */}
        {tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            depth={0}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => onSelectFolder(id)}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
      </ul>
    </nav>
  )
}
