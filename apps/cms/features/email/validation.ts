import { z } from 'zod'
import { messages } from '@/lib/messages'
import { CMS_BLOCK_REGISTRY } from './block-registry'

// ---------------------------------------------------------------------------
// blockSchema derive'owany z CMS_BLOCK_REGISTRY — SSoT dla schematów bloków.
//
// Schematy w rejestrze walidują pola bloku bez `id` (id jest atrybutem edytora,
// nie konfiguracji bloku). Tu rozszerzamy każdy schemat o wymagane `id` do
// walidacji bloków przechowywanych w DB.
//
// discriminatedUnion wymaga konkretnych ZodObject z literałowym `type` discriminantem.
// Pobieramy schematy per-klucz bezpośrednio z registry — zachowuje pełne typy
// dla z.infer<typeof updateEmailTemplateSchema>.
//
// BlockStyleCommon mixin (Phase 2, AAA-T-221) — wszystkie pola są opcjonalne
// w schemacie rejestru (marginBottom, paddingTop/Right/Bottom/Left). Casts
// poniżej deklarują tylko pola "domain-specific" — Zod runtime nadal waliduje
// blockStyleCommonShape z rejestru.
//
// ColumnsBlock (nested): nonColumnsBlockSchema (z.lazy()) wyklucza 'columns' z dzieci
// zapewniając max nesting = 1. blockSchema jest z.lazy() bo zależy od columnsSchema,
// a columnsSchema zależy od nonColumnsBlockSchema — cykl wymaga z.lazy().
// ---------------------------------------------------------------------------

const blockIdSchema = z.object({ id: z.string().min(1) })

// Optional spacing fields — declared at the TS cast level so z.infer<> picks
// them up. Runtime validation lives in block-registry.ts (blockStyleCommonShape).
// Internal padding removed (AAA-T-221 v2 model — baked per block type in renderer).
type BlockStyleCommonTypes = {
  marginBottom: z.ZodOptional<z.ZodEnum<['none', 'compact', 'normal', 'large']>>
}

// URL field allows both real URLs and template variables like {{responseUrl}}
// CTA: nadpisujemy schemat url z registry — rejestr akceptuje dowolny string,
// tu wymagamy poprawnego URL lub szablonu {{zmienna}}.
const templateOrUrl = z.string().min(1, messages.validation.invalidUrl).refine(
  (val) => /^\{\{.+\}\}$/.test(val) || z.string().url().safeParse(val).success,
  { message: messages.validation.invalidUrl }
)

// Pobieramy konkretne schematy z registry i łączymy z blockIdSchema.
// Jawne per-typ podejście zachowuje discriminatedUnion type inference.
//
// Phase 4 (AAA-T-221) — `backgroundColor` moved from per-block fields to
// BlockBorder mixin (optional). Casts below no longer declare it; runtime
// validation still picks it up via blockBorderShape spread in block-registry.
const headerSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.header.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'header'>
    companyName: z.ZodString
    textColor: z.ZodString
  } & BlockStyleCommonTypes>
)

const textSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.text.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'text'>
    content: z.ZodString
  } & BlockStyleCommonTypes>
)

const ctaSchema = blockIdSchema
  .merge(
    CMS_BLOCK_REGISTRY.cta.validationSchema as z.ZodObject<{
      type: z.ZodLiteral<'cta'>
      label: z.ZodString
      url: z.ZodString
      textColor: z.ZodString
    } & BlockStyleCommonTypes>
  )
  .extend({ url: templateOrUrl })

const dividerSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.divider.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'divider'>
    color: z.ZodString
  } & BlockStyleCommonTypes>
)

const footerSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.footer.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'footer'>
    text: z.ZodString
  } & BlockStyleCommonTypes>
)

const headingSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.heading.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'heading'>
    text: z.ZodString
    level: z.ZodEnum<['h1', 'h2', 'h3']>
    color: z.ZodString
  } & BlockStyleCommonTypes>
)

// imageSchema — używamy bezpośrednio schematu z rejestru przez ZodSchema cast,
// żeby zachować imageSrcSchema (ZodEffects z refine) nienaruszony.
// Cast do z.ZodType<...> zamiast ZodObject bo imageSrcSchema to ZodEffects, nie ZodString.
const imageSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.image.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'image'>
    src: z.ZodEffects<z.ZodString>
    alt: z.ZodString
    width: z.ZodNumber
    alignment: z.ZodEnum<['left', 'center', 'right']>
  } & BlockStyleCommonTypes>
)

const spacerSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.spacer.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'spacer'>
    size: z.ZodEnum<['sm', 'md', 'lg', 'xl']>
  } & BlockStyleCommonTypes>
)

// nonColumnsBlockSchema — bloki które mogą być zagnieżdżone w columns (wszystkie oprócz 'columns').
// z.lazy() wymagane bo schemas są tworzone we wzajemnej zależności:
//   nonColumnsBlockSchema → (bez columnsSchema)
//   columnsSchema → nonColumnsBlockSchema
//   blockSchema → columnsSchema + nonColumnsBlockSchema
//
// z.lazy() wymagane: columnsSchema (zdefiniowane PONIŻEJ) używa nonColumnsBlockSchema przez .extend().
// Bez z.lazy() TypeScript rzuca "Cannot access before initialization" (TDZ).
// Brak kolumns w discriminatedUnion = max nesting depth=1 egzekwowane po stronie serwera.
const nonColumnsBlockSchema: z.ZodType = z.lazy(() =>
  z.discriminatedUnion('type', [
    headerSchema,
    textSchema,
    ctaSchema,
    dividerSchema,
    footerSchema,
    headingSchema,
    imageSchema,
    spacerSchema,
  ])
)

const columnsSchema = blockIdSchema.merge(
  CMS_BLOCK_REGISTRY.columns.validationSchema as z.ZodObject<{
    type: z.ZodLiteral<'columns'>
    leftChildren: z.ZodArray<z.ZodUnknown>
    rightChildren: z.ZodArray<z.ZodUnknown>
    gap: z.ZodEnum<['sm', 'md', 'lg']>
    verticalAlign: z.ZodEnum<['top', 'middle', 'bottom']>
  } & BlockStyleCommonTypes>
).extend({
  // Nadpisujemy leftChildren / rightChildren żeby zastosować głębszą walidację nonColumnsBlockSchema.
  // columnsBlockSchema w rejestrze używa z.array(z.unknown()) — tu wymagamy pełnej walidacji dzieci.
  leftChildren: z.array(nonColumnsBlockSchema),
  rightChildren: z.array(nonColumnsBlockSchema),
})

const blockSchema = z.discriminatedUnion('type', [
  headerSchema,
  textSchema,
  ctaSchema,
  dividerSchema,
  footerSchema,
  headingSchema,
  imageSchema,
  spacerSchema,
  columnsSchema,
])

const templateVariableSchema = z.object({
  key: z.string().regex(/^\w+$/).max(100),
  label: z.string().max(200),
  description: z.string().max(500).optional(),
  source: z.enum(['trigger', 'manual']).optional(),
})

// Slug = `email_templates.type` w DB. Workflowy referencjonują szablon po sluggu,
// więc nie pozwalamy go zmienić po utworzeniu. Regex: lowercase ASCII, cyfry, _,
// start od litery, max 50 znaków. `_check` constraint zdjęty migracją AAA-T-221.
export const templateSlugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_]*$/, messages.validation.invalidTemplateSlug)

export const templateLabelSchema = z
  .string()
  .min(1, messages.validation.templateLabelRequired)
  .max(100, messages.validation.templateLabelMax)

export const createEmailTemplateSchema = z.object({
  type: templateSlugSchema,
  label: templateLabelSchema,
})

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>

export const updateEmailTemplateSchema = z.object({
  subject: z.string().min(1, messages.validation.subjectRequired).max(200, messages.validation.subjectTooLong),
  blocks: z.array(blockSchema).min(1, messages.validation.templateNeedsBlock),
  template_variables: z.array(templateVariableSchema).optional(),
  label: templateLabelSchema.optional(),
})

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
