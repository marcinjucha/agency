import { describe, it, expect } from 'vitest'
import { getMediaTypeFromMime, isDownloadableMediaType, formatFileSize } from '../utils'

// ---------------------------------------------------------------------------
// getMediaTypeFromMime
// ---------------------------------------------------------------------------

describe('getMediaTypeFromMime', () => {
  it('maps image/jpeg to image', () => {
    expect(getMediaTypeFromMime('image/jpeg')).toBe('image')
  })

  it('maps image/png to image', () => {
    expect(getMediaTypeFromMime('image/png')).toBe('image')
  })

  it('maps image/gif to image', () => {
    expect(getMediaTypeFromMime('image/gif')).toBe('image')
  })

  it('maps video/mp4 to video', () => {
    expect(getMediaTypeFromMime('video/mp4')).toBe('video')
  })

  it('maps video/webm to video', () => {
    expect(getMediaTypeFromMime('video/webm')).toBe('video')
  })

  it('maps audio/mpeg to audio', () => {
    expect(getMediaTypeFromMime('audio/mpeg')).toBe('audio')
  })

  it('maps audio/wav to audio', () => {
    expect(getMediaTypeFromMime('audio/wav')).toBe('audio')
  })

  it('maps audio/aac to audio', () => {
    expect(getMediaTypeFromMime('audio/aac')).toBe('audio')
  })

  it('maps application/pdf to document', () => {
    expect(getMediaTypeFromMime('application/pdf')).toBe('document')
  })

  it('maps application/msword to document', () => {
    expect(getMediaTypeFromMime('application/msword')).toBe('document')
  })

  it('maps application/vnd.openxmlformats-officedocument.wordprocessingml.document to document', () => {
    expect(
      getMediaTypeFromMime(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe('document')
  })

  it('maps application/vnd.ms-powerpoint to document', () => {
    expect(getMediaTypeFromMime('application/vnd.ms-powerpoint')).toBe('document')
  })

  it('maps application/vnd.ms-excel to document', () => {
    expect(getMediaTypeFromMime('application/vnd.ms-excel')).toBe('document')
  })

  it('maps image/avif to image', () => {
    expect(getMediaTypeFromMime('image/avif')).toBe('image')
  })

  it('maps video/quicktime to video', () => {
    expect(getMediaTypeFromMime('video/quicktime')).toBe('video')
  })

  it('returns null for unknown application MIME (application/zip)', () => {
    expect(getMediaTypeFromMime('application/zip')).toBeNull()
  })

  it('returns null for application/javascript (security: never silently classify as image)', () => {
    expect(getMediaTypeFromMime('application/javascript')).toBeNull()
  })

  it('returns null for text/html', () => {
    expect(getMediaTypeFromMime('text/html')).toBeNull()
  })

  it('returns null for application/octet-stream', () => {
    expect(getMediaTypeFromMime('application/octet-stream')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getMediaTypeFromMime('')).toBeNull()
  })

  it('returns null for application/vnd.ms-fontobject (was overly permissive prefix match)', () => {
    expect(getMediaTypeFromMime('application/vnd.ms-fontobject')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isDownloadableMediaType
// ---------------------------------------------------------------------------

describe('isDownloadableMediaType', () => {
  it('returns true for document', () => {
    expect(isDownloadableMediaType('document')).toBe(true)
  })

  it('returns true for audio', () => {
    expect(isDownloadableMediaType('audio')).toBe(true)
  })

  it('returns false for image', () => {
    expect(isDownloadableMediaType('image')).toBe(false)
  })

  it('returns false for video', () => {
    expect(isDownloadableMediaType('video')).toBe(false)
  })

  it('returns false for youtube', () => {
    expect(isDownloadableMediaType('youtube')).toBe(false)
  })

  it('returns false for vimeo', () => {
    expect(isDownloadableMediaType('vimeo')).toBe(false)
  })

  it('returns false for instagram', () => {
    expect(isDownloadableMediaType('instagram')).toBe(false)
  })

  it('returns false for tiktok', () => {
    expect(isDownloadableMediaType('tiktok')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------

describe('formatFileSize', () => {
  it('returns empty string for null', () => {
    expect(formatFileSize(null)).toBe('')
  })

  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('returns bytes for values under 1024', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('returns KB for values under 1MB', () => {
    expect(formatFileSize(1500)).toBe('1.5 KB')
  })

  it('returns MB for values 1MB and above', () => {
    expect(formatFileSize(1500000)).toBe('1.4 MB')
  })

  it('returns exact bytes at 1023 boundary', () => {
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('returns KB at 1024 bytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('returns MB at exactly 1MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })
})
