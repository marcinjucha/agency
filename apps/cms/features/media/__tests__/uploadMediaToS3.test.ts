/**
 * Regression test for FIX 1 — uploadMediaToS3 must call generatePresignedUrlFn
 * directly (NOT fetch a non-existent `/api/upload` route).
 *
 * Why this test exists:
 * - The old implementation called `fetch(routes.api.upload, ...)` which
 *   pointed at `/api/upload` — a route that was never created. Every
 *   InsertDownloadableAssetModal upload, blog cover image upload, and
 *   InsertMediaModal LibraryTab upload silently 404'd in production for
 *   the entire duration of AAA-T-110.
 * - This test pins the call shape (server-fn invocation + S3 PUT) so a
 *   future refactor can't reintroduce the broken HTTP indirection without
 *   the test failing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server fn module BEFORE importing the helper under test.
// `vi.mock` is hoisted above all imports — top-level `const` references
// inside the factory would TDZ. `vi.hoisted` lifts the mock function
// allocation alongside the mock so the factory can refer to it safely.
const { mockGeneratePresignedUrlFn } = vi.hoisted(() => ({
  mockGeneratePresignedUrlFn: vi.fn(),
}))

vi.mock('../server', () => ({
  generatePresignedUrlFn: mockGeneratePresignedUrlFn,
}))

import { uploadMediaToS3 } from '../utils'

describe('uploadMediaToS3', () => {
  beforeEach(() => {
    mockGeneratePresignedUrlFn.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls generatePresignedUrlFn with the file name + content type', async () => {
    mockGeneratePresignedUrlFn.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload?sig=abc',
      fileUrl: 'https://s3.example.com/key.pdf',
      s3Key: 'tenants/X/media/123_file.pdf',
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    const file = new File([new Uint8Array(64)], 'doc.pdf', { type: 'application/pdf' })
    await uploadMediaToS3(file)

    expect(mockGeneratePresignedUrlFn).toHaveBeenCalledWith({
      data: { fileName: 'doc.pdf', contentType: 'application/pdf' },
    })
  })

  it('does NOT fetch a top-level /api/upload route (regression for the 404 bug)', async () => {
    mockGeneratePresignedUrlFn.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload?sig=abc',
      fileUrl: 'https://s3.example.com/key.pdf',
      s3Key: 'k',
    })
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true })

    const file = new File([new Uint8Array(8)], 'doc.pdf', { type: 'application/pdf' })
    await uploadMediaToS3(file)

    // The only fetch call must be the S3 PUT — never an /api/upload POST.
    const calls = fetchMock.mock.calls
    for (const [url] of calls) {
      expect(String(url)).not.toMatch(/\/api\/upload/i)
    }
    // And the S3 PUT must have happened.
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example.com/upload?sig=abc',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('rejects unknown MIME types before calling the server fn', async () => {
    const file = new File([new Uint8Array(8)], 'evil.exe', { type: 'application/x-msdownload' })
    await expect(uploadMediaToS3(file)).rejects.toThrow()
    expect(mockGeneratePresignedUrlFn).not.toHaveBeenCalled()
  })

  it('rejects oversized files before calling the server fn', async () => {
    // 6MB image — exceeds the 5MB IMAGE_MAX_SIZE
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    await expect(uploadMediaToS3(file)).rejects.toThrow()
    expect(mockGeneratePresignedUrlFn).not.toHaveBeenCalled()
  })

  it('returns the fileUrl + s3Key from the server fn response', async () => {
    mockGeneratePresignedUrlFn.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      fileUrl: 'https://s3.example.com/file.pdf',
      s3Key: 'tenants/X/media/file.pdf',
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    const file = new File([new Uint8Array(8)], 'file.pdf', { type: 'application/pdf' })
    const result = await uploadMediaToS3(file)

    expect(result).toEqual({
      fileUrl: 'https://s3.example.com/file.pdf',
      s3Key: 'tenants/X/media/file.pdf',
    })
  })
})
