'use client'

import { Button, Input, Label, Textarea } from '@agency/ui'
import { messages } from '@/lib/messages'
import type {
  LandingBlock,
  NavbarBlock,
  HeroBlock,
  IdentificationBlock,
  ProblemsBlock,
  ProcessBlock,
  ResultsBlock,
  CtaBlock,
  FooterBlock,
} from '@agency/database'

interface BlockFieldEditorProps {
  block: LandingBlock
  onChange: (updated: LandingBlock) => void
}

export function BlockFieldEditor({ block, onChange }: BlockFieldEditorProps) {
  switch (block.type) {
    case 'navbar':
      return <NavbarEditor block={block} onChange={onChange} />
    case 'hero':
      return <HeroEditor block={block} onChange={onChange} />
    case 'identification':
      return <IdentificationEditor block={block} onChange={onChange} />
    case 'problems':
      return <ProblemsEditor block={block} onChange={onChange} />
    case 'process':
      return <ProcessEditor block={block} onChange={onChange} />
    case 'results':
      return <ResultsEditor block={block} onChange={onChange} />
    case 'cta':
      return <CtaEditor block={block} onChange={onChange} />
    case 'footer':
      return <FooterEditor block={block} onChange={onChange} />
  }
}

// --- Helpers ---

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

interface StringArrayFieldProps {
  label: string
  items: string[]
  onChange: (updated: string[]) => void
}

function StringArrayField({ label, items, onChange }: StringArrayFieldProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              {messages.common.delete}
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          {messages.common.add}
        </Button>
      </div>
    </div>
  )
}

// --- Object array helpers ---

interface ObjectArrayFieldProps<T> {
  label: string
  items: T[]
  fields: { key: keyof T; label: string; multiline?: boolean }[]
  onChange: (updated: T[]) => void
  emptyItem: T
}

function ObjectArrayField<T extends Record<string, string>>({
  label,
  items,
  fields,
  onChange,
  emptyItem,
}: ObjectArrayFieldProps<T>) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/50 p-3">
            {fields.map((field) => {
              const fieldId = `${label}-${i}-${String(field.key)}`
              return (
                <Field key={String(field.key)} label={field.label} id={fieldId}>
                  {field.multiline ? (
                    <Textarea
                      id={fieldId}
                      rows={2}
                      autoResize
                      value={item[field.key]}
                      onChange={(e) => {
                        const next = [...items]
                        next[i] = { ...next[i], [field.key]: e.target.value }
                        onChange(next)
                      }}
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      value={item[field.key]}
                      onChange={(e) => {
                        const next = [...items]
                        next[i] = { ...next[i], [field.key]: e.target.value }
                        onChange(next)
                      }}
                    />
                  )}
                </Field>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              {messages.common.delete}
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, emptyItem])}>
          {messages.common.add}
        </Button>
      </div>
    </div>
  )
}

// --- Block editors ---

function NavbarEditor({ block, onChange }: { block: NavbarBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label={messages.landing.ctaText} id="navbar-ctaText">
        <Input id="navbar-ctaText" value={block.ctaText} onChange={(e) => onChange({ ...block, ctaText: e.target.value })} />
      </Field>
      <Field label={messages.landing.ctaLink} id="navbar-ctaHref">
        <Input id="navbar-ctaHref" value={block.ctaHref} onChange={(e) => onChange({ ...block, ctaHref: e.target.value })} />
      </Field>
    </div>
  )
}

function HeroEditor({ block, onChange }: { block: HeroBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label={messages.landing.headline} id="hero-headline">
        <Input id="hero-headline" value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} />
      </Field>
      <Field label={messages.landing.subheadline} id="hero-subheadline">
        <Textarea id="hero-subheadline" rows={2} autoResize value={block.subheadline} onChange={(e) => onChange({ ...block, subheadline: e.target.value })} />
      </Field>
      <Field label={messages.landing.ctaButtonText} id="hero-ctaText">
        <Input id="hero-ctaText" value={block.cta.text} onChange={(e) => onChange({ ...block, cta: { ...block.cta, text: e.target.value } })} />
      </Field>
      <Field label={messages.landing.ctaButtonLink} id="hero-ctaHref">
        <Input id="hero-ctaHref" value={block.cta.href} onChange={(e) => onChange({ ...block, cta: { ...block.cta, href: e.target.value } })} />
      </Field>
      <Field label={messages.landing.trustLine} id="hero-trustLine">
        <Input id="hero-trustLine" value={block.trustLine} onChange={(e) => onChange({ ...block, trustLine: e.target.value })} />
      </Field>
    </div>
  )
}

function IdentificationEditor({ block, onChange }: { block: IdentificationBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Nagłówek (eyebrow)" id="identification-eyebrow">
        <Input id="identification-eyebrow" value={block.eyebrow} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} />
      </Field>
      <ObjectArrayField
        label="Elementy"
        items={block.items}
        fields={[
          { key: 'icon', label: 'Ikona (nazwa Lucide)' },
          { key: 'text', label: 'Tekst' },
        ]}
        onChange={(items) => onChange({ ...block, items })}
        emptyItem={{ icon: '', text: '' }}
      />
      <Field label="Przejście" id="identification-transition">
        <Textarea id="identification-transition" rows={2} autoResize value={block.transition} onChange={(e) => onChange({ ...block, transition: e.target.value })} />
      </Field>
    </div>
  )
}

function ProblemsEditor({ block, onChange }: { block: ProblemsBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł" id="problems-title">
        <Input id="problems-title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <Field label="Statystyka" id="problems-stat">
        <Textarea id="problems-stat" rows={2} autoResize value={block.stat} onChange={(e) => onChange({ ...block, stat: e.target.value })} />
      </Field>
      <StringArrayField
        label="Elementy listy"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
    </div>
  )
}

function ProcessEditor({ block, onChange }: { block: ProcessBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Odznaka" id="process-badge">
        <Input id="process-badge" value={block.badge} onChange={(e) => onChange({ ...block, badge: e.target.value })} />
      </Field>
      <Field label="Nagłówek" id="process-headline">
        <Input id="process-headline" value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} />
      </Field>
      <Field label="Nagłówek 2" id="process-headline2">
        <Input id="process-headline2" value={block.headline2} onChange={(e) => onChange({ ...block, headline2: e.target.value })} />
      </Field>
      <ObjectArrayField
        label="Kroki"
        items={block.steps}
        fields={[
          { key: 'icon', label: 'Ikona (nazwa Lucide)' },
          { key: 'label', label: 'Etykieta' },
          { key: 'text', label: 'Opis', multiline: true },
        ]}
        onChange={(steps) => onChange({ ...block, steps })}
        emptyItem={{ icon: '', label: '', text: '' }}
      />
      <Field label="Tytuł ryzyka" id="process-riskTitle">
        <Input id="process-riskTitle" value={block.riskTitle} onChange={(e) => onChange({ ...block, riskTitle: e.target.value })} />
      </Field>
      <Field label="Opis ryzyka" id="process-riskDescription">
        <Textarea id="process-riskDescription" rows={3} autoResize value={block.riskDescription} onChange={(e) => onChange({ ...block, riskDescription: e.target.value })} />
      </Field>
      <Field label="Dowód" id="process-proof">
        <Textarea id="process-proof" rows={2} autoResize value={block.proof} onChange={(e) => onChange({ ...block, proof: e.target.value })} />
      </Field>
    </div>
  )
}

function ResultsEditor({ block, onChange }: { block: ResultsBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł" id="results-title">
        <Input id="results-title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <ObjectArrayField
        label="Metryki"
        items={block.metrics}
        fields={[
          { key: 'value', label: 'Wartość' },
          { key: 'label', label: 'Etykieta' },
        ]}
        onChange={(metrics) => onChange({ ...block, metrics })}
        emptyItem={{ value: '', label: '' }}
      />
      <ObjectArrayField
        label="Rezultaty"
        items={block.outcomes}
        fields={[
          { key: 'title', label: 'Tytuł' },
          { key: 'detail', label: 'Szczegóły', multiline: true },
        ]}
        onChange={(outcomes) => onChange({ ...block, outcomes })}
        emptyItem={{ title: '', detail: '' }}
      />
      <Field label="Tytuł kwalifikacji" id="results-qualificationTitle">
        <Input id="results-qualificationTitle" value={block.qualificationTitle} onChange={(e) => onChange({ ...block, qualificationTitle: e.target.value })} />
      </Field>
      <StringArrayField
        label="Kryteria kwalifikacji"
        items={block.qualificationItems}
        onChange={(qualificationItems) => onChange({ ...block, qualificationItems })}
      />
    </div>
  )
}

function CtaEditor({ block, onChange }: { block: CtaBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Nagłówek" id="cta-headline">
        <Input id="cta-headline" value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} />
      </Field>
      <Field label="Opis" id="cta-description">
        <Textarea id="cta-description" rows={3} autoResize value={block.description} onChange={(e) => onChange({ ...block, description: e.target.value })} />
      </Field>
      <Field label="Przycisk — tekst" id="cta-buttonText">
        <Input id="cta-buttonText" value={block.button.text} onChange={(e) => onChange({ ...block, button: { ...block.button, text: e.target.value } })} />
      </Field>
      <Field label="Przycisk — link" id="cta-buttonHref">
        <Input id="cta-buttonHref" value={block.button.href} onChange={(e) => onChange({ ...block, button: { ...block.button, href: e.target.value } })} />
      </Field>
      <Field label="Linia zaufania" id="cta-trustLine">
        <Input id="cta-trustLine" value={block.trustLine} onChange={(e) => onChange({ ...block, trustLine: e.target.value })} />
      </Field>
    </div>
  )
}

function FooterEditor({ block, onChange }: { block: FooterBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Opis" id="footer-description">
        <Textarea id="footer-description" rows={3} autoResize value={block.description} onChange={(e) => onChange({ ...block, description: e.target.value })} />
      </Field>
      <Field label="Polityka prywatności — tekst linku" id="footer-privacy">
        <Input id="footer-privacy" value={block.privacy} onChange={(e) => onChange({ ...block, privacy: e.target.value })} />
      </Field>
      <Field label="Regulamin — tekst linku" id="footer-terms">
        <Input id="footer-terms" value={block.terms} onChange={(e) => onChange({ ...block, terms: e.target.value })} />
      </Field>
      <Field label="Copyright" id="footer-copyright">
        <Input id="footer-copyright" value={block.copyright} onChange={(e) => onChange({ ...block, copyright: e.target.value })} />
      </Field>
    </div>
  )
}
