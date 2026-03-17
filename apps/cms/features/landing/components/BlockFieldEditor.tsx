'use client'

import { Button, Input, Label, Textarea } from '@agency/ui'
import type {
  LandingBlock,
  NavbarBlock,
  HeroBlock,
  ProblemsBlock,
  GuaranteeBlock,
  RiskReversalBlock,
  BenefitsBlock,
  QualificationBlock,
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
    case 'problems':
      return <ProblemsEditor block={block} onChange={onChange} />
    case 'guarantee':
      return <GuaranteeEditor block={block} onChange={onChange} />
    case 'riskReversal':
      return <RiskReversalEditor block={block} onChange={onChange} />
    case 'benefits':
      return <BenefitsEditor block={block} onChange={onChange} />
    case 'qualification':
      return <QualificationEditor block={block} onChange={onChange} />
    case 'cta':
      return <CtaEditor block={block} onChange={onChange} />
    case 'footer':
      return <FooterEditor block={block} onChange={onChange} />
  }
}

// --- Helpers ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
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
              Usuń
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          + Dodaj
        </Button>
      </div>
    </div>
  )
}

// --- Block editors ---

function NavbarEditor({ block, onChange }: { block: NavbarBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tekst CTA">
        <Input value={block.ctaText} onChange={(e) => onChange({ ...block, ctaText: e.target.value })} />
      </Field>
      <Field label="Link CTA">
        <Input value={block.ctaHref} onChange={(e) => onChange({ ...block, ctaHref: e.target.value })} />
      </Field>
    </div>
  )
}

function HeroEditor({ block, onChange }: { block: HeroBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Metryka 1 — wartość">
        <Input value={block.metric1Value} onChange={(e) => onChange({ ...block, metric1Value: e.target.value })} />
      </Field>
      <Field label="Metryka 1 — etykieta">
        <Input value={block.metric1Label} onChange={(e) => onChange({ ...block, metric1Label: e.target.value })} />
      </Field>
      <Field label="Metryka 2 — wartość">
        <Input value={block.metric2Value} onChange={(e) => onChange({ ...block, metric2Value: e.target.value })} />
      </Field>
      <Field label="Metryka 2 — etykieta">
        <Input value={block.metric2Label} onChange={(e) => onChange({ ...block, metric2Label: e.target.value })} />
      </Field>
      <StringArrayField
        label="Kwalifikatory"
        items={block.qualifiers}
        onChange={(qualifiers) => onChange({ ...block, qualifiers })}
      />
      <Field label="Zła wiadomość">
        <Input value={block.badNews} onChange={(e) => onChange({ ...block, badNews: e.target.value })} />
      </Field>
      <Field label="Dobra wiadomość">
        <Textarea rows={3} value={block.goodNews} onChange={(e) => onChange({ ...block, goodNews: e.target.value })} />
      </Field>
      <Field label="Propozycja wartości">
        <Textarea rows={3} value={block.valueProp} onChange={(e) => onChange({ ...block, valueProp: e.target.value })} />
      </Field>
      <Field label="Gwarancja">
        <Textarea rows={3} value={block.guarantee} onChange={(e) => onChange({ ...block, guarantee: e.target.value })} />
      </Field>
      <Field label="Tekst CTA">
        <Input value={block.cta} onChange={(e) => onChange({ ...block, cta: e.target.value })} />
      </Field>
    </div>
  )
}

function ProblemsEditor({ block, onChange }: { block: ProblemsBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł">
        <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <Field label="Statystyka">
        <Textarea rows={2} value={block.stat} onChange={(e) => onChange({ ...block, stat: e.target.value })} />
      </Field>
      <StringArrayField
        label="Elementy listy"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
      <Field label="Kontekstualizacja">
        <Textarea rows={3} value={block.framing} onChange={(e) => onChange({ ...block, framing: e.target.value })} />
      </Field>
      <Field label="Haczyk">
        <Textarea rows={3} value={block.hook} onChange={(e) => onChange({ ...block, hook: e.target.value })} />
      </Field>
    </div>
  )
}

function GuaranteeEditor({ block, onChange }: { block: GuaranteeBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Odznaka">
        <Input value={block.badge} onChange={(e) => onChange({ ...block, badge: e.target.value })} />
      </Field>
      <Field label="Nagłówek">
        <Input value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} />
      </Field>
      <Field label="Nagłówek 2">
        <Input value={block.headline2} onChange={(e) => onChange({ ...block, headline2: e.target.value })} />
      </Field>
      <Field label="Opis">
        <Textarea rows={3} value={block.description} onChange={(e) => onChange({ ...block, description: e.target.value })} />
      </Field>
      <StringArrayField
        label="Kroki"
        items={block.steps}
        onChange={(steps) => onChange({ ...block, steps })}
      />
      <Field label="Dowód">
        <Textarea rows={3} value={block.proof} onChange={(e) => onChange({ ...block, proof: e.target.value })} />
      </Field>
    </div>
  )
}

function RiskReversalEditor({ block, onChange }: { block: RiskReversalBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł">
        <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <Field label="Krok 1 — etykieta">
        <Input value={block.step1Label} onChange={(e) => onChange({ ...block, step1Label: e.target.value })} />
      </Field>
      <Field label="Krok 1 — treść">
        <Textarea rows={3} value={block.step1Text} onChange={(e) => onChange({ ...block, step1Text: e.target.value })} />
      </Field>
      <Field label="Krok 2 — etykieta">
        <Input value={block.step2Label} onChange={(e) => onChange({ ...block, step2Label: e.target.value })} />
      </Field>
      <Field label="Krok 2 — treść">
        <Textarea rows={3} value={block.step2Text} onChange={(e) => onChange({ ...block, step2Text: e.target.value })} />
      </Field>
      <Field label="Podsumowanie">
        <Textarea rows={2} value={block.closing} onChange={(e) => onChange({ ...block, closing: e.target.value })} />
      </Field>
      <Field label="Wyróżnienie">
        <Input value={block.bold} onChange={(e) => onChange({ ...block, bold: e.target.value })} />
      </Field>
      <Field label="Transparentność">
        <Textarea rows={3} value={block.transparency} onChange={(e) => onChange({ ...block, transparency: e.target.value })} />
      </Field>
    </div>
  )
}

function BenefitsEditor({ block, onChange }: { block: BenefitsBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł">
        <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <StringArrayField
        label="Korzyści"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
      <Field label="Podsumowanie">
        <Textarea rows={2} value={block.closing} onChange={(e) => onChange({ ...block, closing: e.target.value })} />
      </Field>
    </div>
  )
}

function QualificationEditor({ block, onChange }: { block: QualificationBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Tytuł">
        <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>
      <StringArrayField
        label="Kryteria"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
      <Field label="Separator">
        <Input value={block.separator} onChange={(e) => onChange({ ...block, separator: e.target.value })} />
      </Field>
      <Field label="Element techniczny">
        <Textarea rows={2} value={block.techItem} onChange={(e) => onChange({ ...block, techItem: e.target.value })} />
      </Field>
    </div>
  )
}

function CtaEditor({ block, onChange }: { block: CtaBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Nagłówek">
        <Input value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} />
      </Field>
      <Field label="Opis">
        <Textarea rows={3} value={block.description} onChange={(e) => onChange({ ...block, description: e.target.value })} />
      </Field>
      <Field label="Tekst przycisku">
        <Input value={block.button} onChange={(e) => onChange({ ...block, button: e.target.value })} />
      </Field>
      <Field label="Podpis">
        <Input value={block.subtext} onChange={(e) => onChange({ ...block, subtext: e.target.value })} />
      </Field>
    </div>
  )
}

function FooterEditor({ block, onChange }: { block: FooterBlock; onChange: (b: LandingBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Opis">
        <Textarea rows={3} value={block.description} onChange={(e) => onChange({ ...block, description: e.target.value })} />
      </Field>
      <Field label="Polityka prywatności — tekst linku">
        <Input value={block.privacy} onChange={(e) => onChange({ ...block, privacy: e.target.value })} />
      </Field>
      <Field label="Regulamin — tekst linku">
        <Input value={block.terms} onChange={(e) => onChange({ ...block, terms: e.target.value })} />
      </Field>
      <Field label="Copyright">
        <Input value={block.copyright} onChange={(e) => onChange({ ...block, copyright: e.target.value })} />
      </Field>
    </div>
  )
}
