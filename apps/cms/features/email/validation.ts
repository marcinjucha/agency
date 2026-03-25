import { z } from 'zod'
import { messages } from '@/lib/messages'

const blockBaseSchema = z.object({
  id: z.string().min(1),
})

const headerBlockSchema = blockBaseSchema.extend({
  type: z.literal('header'),
  companyName: z.string().min(1, messages.validation.companyNameRequired),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, messages.validation.invalidHexColor),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, messages.validation.invalidHexColor),
})

const textBlockSchema = blockBaseSchema.extend({
  type: z.literal('text'),
  content: z.string().min(1, messages.validation.contentRequired),
})

const ctaBlockSchema = blockBaseSchema.extend({
  type: z.literal('cta'),
  label: z.string().min(1, messages.validation.buttonLabelRequired),
  url: z.string().url(messages.validation.invalidUrl),
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
  subject: z.string().min(1, messages.validation.subjectRequired).max(200, messages.validation.subjectTooLong),
  blocks: z.array(blockSchema).min(1, messages.validation.templateNeedsBlock),
})

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
