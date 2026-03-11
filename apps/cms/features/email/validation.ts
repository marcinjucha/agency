import { z } from 'zod'

const blockBaseSchema = z.object({
  id: z.string().min(1),
})

const headerBlockSchema = blockBaseSchema.extend({
  type: z.literal('header'),
  companyName: z.string().min(1, 'Nazwa firmy jest wymagana'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Nieprawidłowy kolor hex'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Nieprawidłowy kolor hex'),
})

const textBlockSchema = blockBaseSchema.extend({
  type: z.literal('text'),
  content: z.string().min(1, 'Treść jest wymagana'),
})

const ctaBlockSchema = blockBaseSchema.extend({
  type: z.literal('cta'),
  label: z.string().min(1, 'Etykieta przycisku jest wymagana'),
  url: z.string().url('Nieprawidłowy URL'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

const dividerBlockSchema = blockBaseSchema.extend({
  type: z.literal('divider'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

const footerBlockSchema = blockBaseSchema.extend({
  type: z.literal('footer'),
  text: z.string().min(1),
})

const blockSchema = z.discriminatedUnion('type', [
  headerBlockSchema,
  textBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
  footerBlockSchema,
])

export const updateEmailTemplateSchema = z.object({
  subject: z.string().min(1, 'Temat jest wymagany').max(200, 'Temat jest za długi'),
  blocks: z.array(blockSchema).min(1, 'Szablon musi zawierać co najmniej jeden blok'),
})

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
