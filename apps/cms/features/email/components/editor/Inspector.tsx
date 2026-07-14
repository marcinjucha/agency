import { useState, useEffect, type ReactNode } from 'react'
import { MousePointerClick, Eye, Mail, Copy, Trash2, ChevronDown } from 'lucide-react'
import { Button, Input, cn } from '@agency/ui'
import {
  DEFAULT_BLOCK_TYPOGRAPHY,
  DEFAULT_BLOCK_BORDER,
  DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET,
  isBorderableBlockType,
} from '@agency/email'
import type {
  BlockTypography,
  BlockBorder,
  BorderableBlockType,
  MarginBottomPreset,
} from '@agency/email'
import { messages } from '@/lib/messages'
import { usePermissions } from '@/contexts/permissions-context'
import { ThemePicker } from '@/features/themes/components/ThemePicker'
import { CMS_BLOCK_REGISTRY } from '../../block-registry'
import { VariablesEditor } from '../VariablesEditor'
import { useInspectorSectionState } from '../../hooks/use-inspector-section-state'
import { TypographySection } from './controls/TypographySection'
import { BorderSection } from './controls/BorderSection'
import { SegmentedControl } from './controls/SegmentedControl'
import type { Block, BlockType, TemplateVariable } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

/**
 * Block types that carry typography (5/9 types). Mirrors DEFAULT_BLOCK_TYPOGRAPHY
 * keys — divider/spacer/image/columns have no inline text content.
 */
type TypographicBlockType = 'header' | 'heading' | 'text' | 'cta' | 'footer'

const TYPOGRAPHIC_BLOCK_TYPES: ReadonlySet<BlockType> = new Set<BlockType>([
  'header',
  'heading',
  'text',
  'cta',
  'footer',
])

function isTypographicBlock(type: BlockType): type is TypographicBlockType {
  return TYPOGRAPHIC_BLOCK_TYPES.has(type)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InspectorProps {
  blocks: Block[]
  selectedBlockId: string | null
  onUpdateBlock: (updated: Block) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  label: string
  setLabel: (v: string) => void
  themeId: string | null
  setThemeId: (id: string | null) => void
  userEditedVariables: TemplateVariable[]
  setUserEditedVariables: (vars: TemplateVariable[]) => void
  detectedKeys: string[]
  templateType: string
  /**
   * Content tokens that will NOT be filled (APP-OWNED types only). Computed once
   * in EmailTemplateEditor via `collectUnresolvableTokens` and rendered here as a
   * persistent inline advisory at the top of the Zmienne tab. Empty otherwise.
   */
  unresolvableTokens: string[]
  onDelete: () => void
}

type InspectorTab = 'props' | 'vars' | 'settings'

// ---------------------------------------------------------------------------
// Inspector root — 3-tab right panel
// ---------------------------------------------------------------------------

export function Inspector({
  blocks,
  selectedBlockId,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  label,
  setLabel,
  themeId,
  setThemeId,
  userEditedVariables,
  setUserEditedVariables,
  detectedKeys,
  templateType,
  unresolvableTokens,
  onDelete,
}: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('props')

  // Auto-switch to props tab when a block is selected
  useEffect(() => {
    if (selectedBlockId) setTab('props')
  }, [selectedBlockId])

  return (
    <aside className="flex flex-col border-l border-border bg-card/30 overflow-hidden">
      {/* Tab header */}
      <div className="flex shrink-0">
        <TabButton active={tab === 'props'} onClick={() => setTab('props')}>
          {messages.email.inspectorTabProperties}
        </TabButton>
        <TabButton active={tab === 'vars'} onClick={() => setTab('vars')}>
          {messages.email.inspectorTabVariables}
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          {messages.email.inspectorTabSettings}
        </TabButton>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'props' && (
          <PropertiesTab
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
            onDuplicateBlock={onDuplicateBlock}
            detectedKeys={detectedKeys}
          />
        )}
        {tab === 'vars' && (
          <VariablesTab
            userEditedVariables={userEditedVariables}
            setUserEditedVariables={setUserEditedVariables}
            detectedKeys={detectedKeys}
            templateType={templateType}
            unresolvableTokens={unresolvableTokens}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            label={label}
            setLabel={setLabel}
            themeId={themeId}
            setThemeId={setThemeId}
            templateType={templateType}
            onDelete={onDelete}
          />
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// TabButton
// ---------------------------------------------------------------------------

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card ${
        active
          ? 'border-b-2 border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground border-b-2 border-border/30'
      }`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Tab 1: Properties
// ---------------------------------------------------------------------------

interface PropertiesTabProps {
  blocks: Block[]
  selectedBlockId: string | null
  onUpdateBlock: (updated: Block) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  detectedKeys: string[]
}

function PropertiesTab({
  blocks,
  selectedBlockId,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  detectedKeys,
}: PropertiesTabProps) {
  const selected = blocks.find((b) => b.id === selectedBlockId)

  if (!selected) {
    return <EmptySelection />
  }

  const blockType = selected.type as BlockType
  const entry = CMS_BLOCK_REGISTRY[blockType]
  const EditorComponent = entry?.EditorComponent

  const BlockIcon = entry?.icon
  return (
    <>
      {/*
        P0-2: Block header as visual anchor.
        Rounded-md tinted avatar (h-7 w-7, bg-primary/10) holds the icon at
        h-4 w-4. Title is text-sm font-semibold, description is text-xs muted.
        Duplicate/Delete sit on the right with a thin vertical divider
        between them and the title cluster.
      */}
      <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-start gap-3 shrink-0">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {BlockIcon ? <BlockIcon className="h-4 w-4" aria-hidden="true" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {entry?.label ?? selected.type}
          </p>
          {entry?.description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => onDuplicateBlock(selected.id)}
            aria-label={messages.email.inspectorDuplicateBlock}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border/60" aria-hidden="true" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => onDeleteBlock(selected.id)}
            aria-label={messages.email.inspectorDeleteBlock}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sections: Treść + Typografia + Obramowanie + Układ.
          key={selected.id} on the body remounts the section state per block so
          users see their per-block-type collapse preferences (persisted to
          localStorage by useInspectorSectionState). */}
      <PropertiesTabBody
        key={selected.id}
        selected={selected}
        EditorComponent={EditorComponent}
        detectedKeys={detectedKeys}
        onUpdateBlock={onUpdateBlock}
      />
    </>
  )
}

// EditorComponent type — pulled from registry shape so we don't drift from CmsBlockRegistryEntry.
type EditorComponentT = (typeof CMS_BLOCK_REGISTRY)[BlockType]['EditorComponent']

interface PropertiesTabBodyProps {
  selected: Block
  EditorComponent: EditorComponentT | undefined
  detectedKeys: string[]
  onUpdateBlock: (updated: Block) => void
}

function PropertiesTabBody({ selected, EditorComponent, detectedKeys, onUpdateBlock }: PropertiesTabBodyProps) {
  const [sections, setSectionOpen] = useInspectorSectionState(selected.type)
  const contentOpen = sections.content ?? true
  const typographyOpen = sections.typography ?? false
  const borderOpen = sections.border ?? false
  const layoutOpen = sections.layout ?? false

  const blockType = selected.type as BlockType
  const showTypography = isTypographicBlock(blockType)
  const showBorder = isBorderableBlockType(blockType)

  // Flat editorial layout — no card boxes, no chrome. Each section is just
  // a label + content + thin separator below (Linear/Figma right-panel
  // aesthetic). Drastically reduces visual weight vs the previous stacked
  // CollapsibleCards (each had border + bg tint + chevron + padding stack).
  return (
    <div className="px-4 pb-4">
      <InspectorGroup
        title={messages.email.inspectorSectionContent}
        open={contentOpen}
        onToggle={() => setSectionOpen('content', !contentOpen)}
      >
        {EditorComponent ? (
          <EditorComponent
            block={selected}
            onChange={(updated: Block) => onUpdateBlock(updated)}
            variables={detectedKeys.map((key): TriggerVariable => ({
              key,
              label: key,
              description: '',
              category: 'detected',
            }))}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {messages.email.inspectorNoEditor}
          </p>
        )}
      </InspectorGroup>

      {showTypography ? (
        <InspectorGroup
          title={messages.email.inspectorSectionTypography}
          open={typographyOpen}
          onToggle={() => setSectionOpen('typography', !typographyOpen)}
        >
          <TypographySectionWrapper selected={selected} onUpdateBlock={onUpdateBlock} />
        </InspectorGroup>
      ) : null}

      {showBorder ? (
        <InspectorGroup
          title={messages.email.inspectorSectionBorder}
          open={borderOpen}
          onToggle={() => setSectionOpen('border', !borderOpen)}
        >
          <BorderSectionWrapper selected={selected} onUpdateBlock={onUpdateBlock} />
        </InspectorGroup>
      ) : null}

      <InspectorGroup
        title={messages.email.inspectorSectionLayout}
        open={layoutOpen}
        onToggle={() => setSectionOpen('layout', !layoutOpen)}
        isLast
      >
        <LayoutSection selected={selected} onUpdateBlock={onUpdateBlock} />
      </InspectorGroup>
    </div>
  )
}

/**
 * InspectorGroup — flat collapsible section for the right Inspector panel.
 *
 * Replaces the previous CollapsibleCard pattern (border + bg tint + chevron
 * in a card chrome) with a Linear/Figma-style flat panel: tiny uppercase
 * label, micro-chevron, thin 1px divider below. Drastically reduces visual
 * weight per section so 4 stacked sections feel like a continuous panel,
 * not a stack of boxes.
 *
 * Whole header row is the toggle (40px tap target). Label uses 10px /
 * tracking-[0.08em] / opacity-70 → 100 on hover for a quiet-but-discoverable
 * affordance.
 */
function InspectorGroup({
  title,
  open,
  onToggle,
  children,
  isLast,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  isLast?: boolean
}) {
  return (
    <section className={cn('py-1', isLast ? '' : 'border-b border-border/40')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center justify-between py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 group-hover:text-foreground transition-colors">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-all duration-150',
            open ? '' : '-rotate-90',
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="pb-4 pt-1 space-y-3">{children}</div> : null}
    </section>
  )
}

interface TypographySectionWrapperProps {
  selected: Block
  onUpdateBlock: (updated: Block) => void
}

function TypographySectionWrapper({ selected, onUpdateBlock }: TypographySectionWrapperProps) {
  // Caller passes only typographic blocks (guarded by isTypographicBlock above).
  const defaults = DEFAULT_BLOCK_TYPOGRAPHY[selected.type as TypographicBlockType]

  const current: Partial<BlockTypography> = {
    textAlign: (selected as Partial<BlockTypography>).textAlign,
    textColor: (selected as Partial<BlockTypography>).textColor,
    textColorToken: (selected as Partial<BlockTypography>).textColorToken,
  }

  return (
    <TypographySection
      value={current}
      defaults={defaults}
      onChange={(next) => onUpdateBlock({ ...selected, ...next } as Block)}
    />
  )
}

interface BorderSectionWrapperProps {
  selected: Block
  onUpdateBlock: (updated: Block) => void
}

function BorderSectionWrapper({ selected, onUpdateBlock }: BorderSectionWrapperProps) {
  // Caller guards with isBorderableBlockType — narrow safely.
  const blockType = selected.type as BorderableBlockType
  const defaults = DEFAULT_BLOCK_BORDER[blockType]

  const current: Partial<BlockBorder> = {
    borderColor: (selected as Partial<BlockBorder>).borderColor,
    borderRadius: (selected as Partial<BlockBorder>).borderRadius,
    backgroundColor: (selected as Partial<BlockBorder>).backgroundColor,
    borderColorToken: (selected as Partial<BlockBorder>).borderColorToken,
    backgroundColorToken: (selected as Partial<BlockBorder>).backgroundColorToken,
  }

  return (
    <BorderSection
      blockType={blockType}
      value={current}
      defaults={defaults}
      onChange={(next) => onUpdateBlock({ ...selected, ...next } as Block)}
    />
  )
}

interface LayoutSectionProps {
  selected: Block
  onUpdateBlock: (updated: Block) => void
}

function LayoutSection({ selected, onUpdateBlock }: LayoutSectionProps) {
  const blockType = selected.type as BlockType
  const defaultMargin = DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET[blockType]

  const marginValue = (selected.marginBottom ?? defaultMargin) as MarginBottomPreset

  // Compact visual indicators (• •• •••) replace bulky text labels
  // (Kompaktowy / Normalny / Duży). Tooltip on each option (via title attr
  // inside the icon span) carries the long name + pixel value for hover hint.
  // Inspector real-estate is precious; vertical-rhythm marginBottom is a
  // low-frequency tweak that doesn't deserve 3 full-width word buttons.
  const marginOptions: ReadonlyArray<{
    value: MarginBottomPreset
    label: string
    icon: ReactNode
  }> = [
    {
      value: 'none',
      label: '0',
      icon: <SpacingIcon size="none" title={messages.email.inspectorMarginBottomNone} />,
    },
    {
      value: 'compact',
      label: '8px',
      icon: <SpacingIcon size="sm" title={messages.email.inspectorMarginBottomCompact} />,
    },
    {
      value: 'normal',
      label: '16px',
      icon: <SpacingIcon size="md" title={messages.email.inspectorMarginBottomNormal} />,
    },
    {
      value: 'large',
      label: '32px',
      icon: <SpacingIcon size="lg" title={messages.email.inspectorMarginBottomLarge} />,
    },
  ]

  // Internal padding is BAKED per block type in the renderer (v2 design model,
  // AAA-T-221 2026-05-15). Only vertical-rhythm marginBottom stays user-controllable.
  return (
    <div className="space-y-3">
      <SegmentedControl<MarginBottomPreset>
        label={messages.email.inspectorLayoutMarginBottom}
        value={marginValue}
        options={marginOptions}
        onChange={(v) => onUpdateBlock({ ...selected, marginBottom: v })}
      />
    </div>
  )
}

/**
 * SpacingIcon — visual gap indicator for marginBottom presets.
 * Two stacked bars with a gap between them; gap height grows with preset size.
 * 'none' renders the two bars TOUCHING (no gap) — semantic for 0px margin.
 */
function SpacingIcon({ size, title }: { size: 'none' | 'sm' | 'md' | 'lg'; title: string }) {
  const gapClass =
    size === 'none' ? 'h-0' :
    size === 'sm'   ? 'h-[2px]' :
    size === 'md'   ? 'h-[4px]' :
                      'h-[7px]'
  return (
    <span
      title={title}
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 flex-col items-stretch justify-center gap-0"
    >
      <span className="h-[3px] rounded-[1px] bg-current/70" />
      <span className={gapClass} />
      <span className="h-[3px] rounded-[1px] bg-current/70" />
    </span>
  )
}

function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <MousePointerClick className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {messages.email.inspectorNothingSelected}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {messages.email.inspectorNothingSelectedHint}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2: Variables (Preview data)
// ---------------------------------------------------------------------------

interface VariablesTabProps {
  userEditedVariables: TemplateVariable[]
  setUserEditedVariables: (vars: TemplateVariable[]) => void
  detectedKeys: string[]
  templateType: string
  unresolvableTokens: string[]
}

function VariablesTab({
  userEditedVariables,
  setUserEditedVariables,
  detectedKeys,
  templateType,
  unresolvableTokens,
}: VariablesTabProps) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 shrink-0">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-semibold text-foreground">{messages.email.inspectorPreviewData}</p>
        <span className="ml-auto text-xs text-muted-foreground/60 italic">
          {messages.email.inspectorPreviewDataHint}
        </span>
      </div>
      {unresolvableTokens.length > 0 ? (
        <UnresolvableNote tokens={unresolvableTokens} />
      ) : null}
      <div className="p-3">
        <VariablesEditor
          variables={userEditedVariables}
          onChange={setUserEditedVariables}
          detectedKeys={detectedKeys}
          templateType={templateType}
        />
      </div>
    </>
  )
}

/**
 * Persistent, always-on advisory — the discoverability surface for content
 * tokens that will reach the recipient literally (APP-OWNED types only).
 * `role="status"` (NOT `role="alert"`) + muted/amber: informational, never
 * save-blocking. Real text lists the tokens (a11y — not colour-only).
 */
function UnresolvableNote({ tokens }: { tokens: string[] }) {
  return (
    <div
      role="status"
      className="mx-3 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300"
    >
      <p className="font-medium">{messages.email.unresolvableNoteTitle}</p>
      <p className="mt-1 font-mono text-amber-800 dark:text-amber-200">
        {tokens.map((t) => `{{${t}}}`).join(', ')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3: Settings (Email)
// ---------------------------------------------------------------------------

interface SettingsTabProps {
  label: string
  setLabel: (v: string) => void
  themeId: string | null
  setThemeId: (id: string | null) => void
  templateType: string
  onDelete: () => void
}

function SettingsTab({ label, setLabel, themeId, setThemeId, templateType, onDelete }: SettingsTabProps) {
  // `design.themes` unlocks the theme library; Phase 1 requires only
  // `system.email_templates`. WITHOUT design.themes, mounting ThemePicker would
  // fire the hard-gated `listThemesFn` → thrown query swallowed to `themes=[]` →
  // a misleading "Brak motywów — + Nowy motyw" empty state linking to a route the
  // user cannot open. So we render a read-only inherit chip instead. Client check
  // is UX-only; the server gate on the theme CRUD fns stays authoritative.
  const { hasPermission } = usePermissions()
  const canPickTheme = hasPermission('design.themes')

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 shrink-0">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-semibold text-foreground">
          {messages.email.inspectorTemplateSettings}
        </p>
      </div>
      <div className="p-3 space-y-4">
        <InspectorField label={messages.email.inspectorTemplateNameLabel} htmlFor="inspector-template-name">
          <Input
            id="inspector-template-name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
          />
        </InspectorField>

        <InspectorField label={messages.email.inspectorTemplateKeyLabel}>
          <div
            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5"
            role="textbox"
            aria-readonly="true"
            aria-label={`${messages.email.inspectorTemplateKeyLabel}: ${templateType}`}
          >
            <code className="font-mono text-xs text-muted-foreground">{templateType}</code>
            <span className="ml-auto text-xs text-muted-foreground/60">
              {messages.email.inspectorTemplateKeyReadonly}
            </span>
          </div>
        </InspectorField>

        {/* Whole-template theme scope — sits above the actions/delete divider.
            Reuses the venture ThemePicker at client tier (its inherit-vs-own radio
            is exactly the tenant-default-vs-override choice here). */}
        <InspectorField label={messages.email.inspectorTemplateThemeLabel}>
          {canPickTheme ? (
            <ThemePicker
              level="client"
              inheritedFromLabel={messages.themes.picker.orgThemeName}
              value={themeId}
              onChange={setThemeId}
              id="inspector-template-theme"
            />
          ) : (
            <div
              className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
              role="note"
            >
              {messages.email.inspectorTemplateThemeInheritReadonly}
            </div>
          )}
        </InspectorField>

        <div className="pt-2 border-t border-border/60">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{messages.email.inspectorActionsLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="w-full text-destructive border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {messages.email.deleteAction}
          </Button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// InspectorField — label + child input wrapper
// ---------------------------------------------------------------------------

function InspectorField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</label>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {children}
    </div>
  )
}
