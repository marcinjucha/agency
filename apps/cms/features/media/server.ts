import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { getS3Client, S3_BUCKET, S3_REGION } from '@/lib/s3'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth.server'
import {
  createMediaItemSchema,
  updateMediaItemSchema,
  type CreateMediaItemFormData,
  type UpdateMediaItemFormData,
} from './validation'
import {
  createFolderSchema,
  renameFolderSchema,
  type CreateFolderFormData,
  type RenameFolderFormData,
} from './folder-validation'
import { toMediaItem, type MediaItem, type MediaItemListItem, type MediaType, toMediaItemListItem } from './types'
import type { MediaFolder } from './folder-types'
import { ALLOWED_MIME_TYPES } from './utils'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions — Queries
// ---------------------------------------------------------------------------

export type MediaItemFilters = {
  type?: MediaType
  search?: string
  folder_id?: string | null
  is_downloadable?: boolean
}

/**
 * Applies media item filters to a Supabase query.
 *
 * Extracted as a pure helper (taking a pre-built query builder) so the
 * filter behavior can be tested in isolation without driving the
 * createServerFn RPC pipeline. The query builder must support `.eq`,
 * `.ilike`, and `.is` chained method calls (matches Supabase JS API).
 *
 * folder_id behavior (3-way distinction — MUST be preserved):
 * - undefined (default): no folder filter — returns ALL items (backward compat for InsertMediaModal)
 * - null: items without a folder (unsorted/root)
 * - string: items in a specific folder
 *
 * is_downloadable behavior:
 * - undefined: no filter — returns all items
 * - true/false: filters by flag
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMediaItemFilters(query: any, filters: MediaItemFilters | undefined): any {
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // folder_id: undefined = all items, null = unsorted/root, string = specific folder
  if (filters?.folder_id !== undefined) {
    if (filters.folder_id === null) {
      query = query.is('folder_id', null)
    } else {
      query = query.eq('folder_id', filters.folder_id)
    }
  }

  // is_downloadable: undefined = all items, true/false = filter by flag
  if (filters?.is_downloadable !== undefined) {
    query = query.eq('is_downloadable', filters.is_downloadable)
  }

  return query
}

/**
 * Fetch media items with optional filters.
 * Filter logic delegated to applyMediaItemFilters for testability.
 */
export const getMediaItemsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MediaItemFilters) => input)
  .handler(async ({ data: filters }): Promise<MediaItemListItem[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseQuery = (supabase as any)
      .from('media_items')
      .select('id, name, type, url, mime_type, size_bytes, thumbnail_url, created_at, folder_id, is_downloadable')
      .order('created_at', { ascending: false })

    const query = applyMediaItemFilters(baseQuery, filters)

    const { data, error } = await query

    if (error) throw error
    return (data ?? []).map(toMediaItemListItem)
  })

export const getMediaFoldersFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<MediaFolder[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('media_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as MediaFolder[]
  }
)

export const getMediaItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MediaItem | null> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase as any)
      .from('media_items')
      .select('*')
      .eq('id', data.id)
      .maybeSingle()

    if (error) throw error
    if (!row) return null
    return toMediaItem(row)
  })

// ---------------------------------------------------------------------------
// Server Functions — Presigned URL
// ---------------------------------------------------------------------------

/**
 * Halo Efekt's tenant UUID — production tenant ("Halo Efekt", kontakt@haloefekt.pl).
 *
 * Hardcoded as a legacy carve-out for S3 prefix routing: existing media files
 * uploaded by this tenant live under `haloefekt/media/` (absolute URLs in DB),
 * and we keep new uploads in the same prefix so the S3 layout stays consistent
 * with the existing team's mental model. All other tenants use the per-tenant
 * isolation prefix — see `getUploadFolderPrefix` below.
 */
export const HALOEFEKT_TENANT_ID = '19342448-4e4e-49ba-8bf0-694d5376f953'

/**
 * Build the S3 folder prefix for a tenant's uploads.
 *
 * Halo Efekt keeps the legacy 'haloefekt/media' prefix — existing files
 * have absolute URLs in the DB and continue to load; new uploads stay in
 * the same folder for operational consistency with the existing team.
 *
 * Other tenants get per-tenant isolation: 'tenants/{tenantId}/media'.
 * This means S3 inspection / future bucket policies / quotas can be
 * scoped per tenant, and an accidental cross-tenant URL mix-up in a
 * blog post or media item is structurally avoidable.
 *
 * No S3 object migration — URLs in DB are absolute and remain valid.
 */
export function getUploadFolderPrefix(tenantId: string): string {
  if (tenantId === HALOEFEKT_TENANT_ID) {
    return 'haloefekt/media'
  }
  return `tenants/${tenantId}/media`
}

export const generatePresignedUrlFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { fileName: string; contentType: string }) => input
  )
  .handler(
    async ({ data }): Promise<{ uploadUrl: string; fileUrl: string; s3Key: string }> => {
      // SECURITY: Auth check — must match createMediaItemFn / deleteMediaItemFn pattern
      const authResult = await requireAuthContext()
      if (authResult.isErr()) {
        throw new Error(messages.common.noPermission)
      }

      // SECURITY: Validate content type against allowlist — rejects .exe, text/html, etc.
      // Single source of truth (ALLOWED_MIME_TYPES from utils) shared with client-side
      // validation in uploadMediaToS3 / InsertMediaModal — drift impossible.
      const { fileName, contentType } = data
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        throw new Error(messages.media.fileTypeNotAllowed)
      }

      const timestamp = Date.now()
      const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      // SECURITY: Folder derived from server-side auth context — never from client input.
      // Halo Efekt = legacy 'haloefekt/media' prefix; all other tenants = 'tenants/{id}/media'.
      const s3Key = `${getUploadFolderPrefix(authResult.value.tenantId)}/${timestamp}_${sanitized}`

      const s3 = getS3Client()
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        ContentType: contentType,
      })

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
      const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`

      return { uploadUrl, fileUrl, s3Key }
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — Media Item Mutations
// ---------------------------------------------------------------------------

export const createMediaItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateMediaItemFormData) => input)
  .handler(async ({ data }): Promise<{ success: boolean; data?: MediaItem; error?: string }> => {
    const parsed = createMediaItemSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.media.invalidData }
    }

    const result = await requireAuthContext().andThen((auth) =>
      insertMediaItem(auth, parsed.data)
    )

    return result.match(
      (item) => ({ success: true, data: item }),
      (error) => ({ success: false, error })
    )
  })

export const updateMediaItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: UpdateMediaItemFormData }) => input)
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const parsed = updateMediaItemSchema.safeParse(input.data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.media.invalidData }
    }

    const result = await requireAuthContext().andThen((auth) =>
      patchMediaItem(auth, input.id, { name: parsed.data.name })
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const deleteMediaItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      fetchAndDeleteMediaItem(auth, data.id)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// Server Functions — Folder Mutations
// ---------------------------------------------------------------------------

export const createFolderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateFolderFormData) => input)
  .handler(async ({ data }): Promise<{ success: boolean; data?: MediaFolder; error?: string }> => {
    const parsed = createFolderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.media.invalidData }
    }

    const result = await requireAuthContext().andThen((auth) =>
      insertFolder(auth, parsed.data)
    )

    return result.match(
      (folder) => ({ success: true, data: folder }),
      (error) => ({ success: false, error })
    )
  })

export const renameFolderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: RenameFolderFormData }) => input)
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const parsed = renameFolderSchema.safeParse(input.data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.media.invalidData }
    }

    const result = await requireAuthContext().andThen((auth) =>
      patchFolder(auth, input.id, { name: parsed.data.name })
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const deleteFolderFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    // Items in this folder get folder_id=NULL via ON DELETE SET NULL
    const result = await requireAuthContext().andThen((auth) =>
      removeFolder(auth, data.id)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const moveMediaItemFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { itemId: string; folderId: string | null }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      patchMediaItem(auth, data.itemId, { folder_id: data.folderId })
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers — media items
// ---------------------------------------------------------------------------

function insertMediaItem(
  auth: AuthContext,
  data: ReturnType<typeof createMediaItemSchema.parse>
): ResultAsync<MediaItem, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_items')
      .insert({
        tenant_id: auth.tenantId,
        name: data.name,
        type: data.type,
        url: data.url,
        s3_key: data.s3_key ?? null,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        folder_id: data.folder_id ?? null,
        is_downloadable: data.is_downloadable ?? false,
      })
      .select()
      .single()
      .then(({ data: row, error }: { data: unknown; error: unknown }) => {
        if (error) throw error
        return toMediaItem(row)
      }),
    dbError
  )
}

function patchMediaItem(
  auth: AuthContext,
  id: string,
  patch: Record<string, unknown>
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_items')
      .update(patch)
      .eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function fetchAndDeleteMediaItem(
  auth: AuthContext,
  id: string
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_items')
      .select('s3_key')
      .eq('id', id)
      .single()
      .then(async ({ data: item, error }: { data: { s3_key: string | null } | null; error: unknown }) => {
        if (error) throw error

        // Delete from S3 if item has an s3_key (uploaded files, not embeds)
        if (item?.s3_key) {
          const s3 = getS3Client()
          await s3.send(
            new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: item.s3_key })
          )
        }

        // Delete DB row (RLS ensures tenant isolation)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deleteError } = await (auth.supabase as any)
          .from('media_items')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError
      }),
    dbError
  )
}

// ---------------------------------------------------------------------------
// DB helpers — folders
// ---------------------------------------------------------------------------

function insertFolder(
  auth: AuthContext,
  data: ReturnType<typeof createFolderSchema.parse>
): ResultAsync<MediaFolder, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_folders')
      .insert({
        tenant_id: auth.tenantId,
        name: data.name,
        parent_id: data.parent_id ?? null,
      })
      .select()
      .single()
      .then(({ data: row, error }: { data: unknown; error: unknown }) => {
        if (error) throw error
        return row as MediaFolder
      }),
    dbError
  )
}

function patchFolder(
  auth: AuthContext,
  id: string,
  patch: Record<string, unknown>
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_folders')
      .update(patch)
      .eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function removeFolder(
  auth: AuthContext,
  id: string
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('media_folders')
      .delete()
      .eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}
