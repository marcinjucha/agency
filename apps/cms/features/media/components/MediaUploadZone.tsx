

import { useRef, useState, useCallback, useId } from 'react'
import { Progress } from '@agency/ui'
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react'
import { createMediaItemFn, generatePresignedUrlFn } from '../server'
import type { MediaType } from '../types'
import { ALLOWED_MIME_TYPES, IMAGE_MAX_SIZE, VIDEO_MAX_SIZE } from '../utils'
import { messages, templates } from '@/lib/messages'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

type UploadJob = {
  fileName: string
  progress: number
  state: UploadState
  error?: string
}

type MediaUploadZoneProps = {
  onUploadComplete: () => void
}

function detectMediaType(mime: string): MediaType {
  return mime.startsWith('image/') ? 'image' : 'video'
}

async function simulateProgress(
  onProgress: (p: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    let p = 0
    const tick = setInterval(() => {
      if (signal.aborted) {
        clearInterval(tick)
        resolve()
        return
      }
      // Curve: fast start → slow approach to 90
      p = Math.min(p + (90 - p) * 0.07 + 1, 90)
      onProgress(Math.round(p))
      if (p >= 90) {
        clearInterval(tick)
        resolve()
      }
    }, 80)
  })
}

export function MediaUploadZone({ onUploadComplete }: MediaUploadZoneProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [jobs, setJobs] = useState<UploadJob[]>([])

  const setJobField = useCallback(
    (index: number, patch: Partial<UploadJob>) => {
      setJobs((prev) =>
        prev.map((j, i) => (i === index ? { ...j, ...patch } : j))
      )
    },
    []
  )

  async function uploadFile(file: File, index: number) {
    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setJobField(index, {
        state: 'error',
        error: messages.media.fileTypeNotAllowed,
        progress: 0,
      })
      return
    }

    // Validate size
    const maxSize = file.type.startsWith('video/') ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024)
      setJobField(index, {
        state: 'error',
        error: templates.media.fileTooLarge(limitMB),
        progress: 0,
      })
      return
    }

    setJobField(index, { state: 'uploading', progress: 0 })

    const abortCtrl = new AbortController()

    try {
      // Start fake progress in parallel with actual upload
      const progressPromise = simulateProgress(
        (p) => setJobField(index, { progress: p }),
        abortCtrl.signal
      )

      // 1. Get presigned URL via server fn (replaces fetch to /api/upload)
      const { uploadUrl, fileUrl, s3Key } = await generatePresignedUrlFn({
        data: { fileName: file.name, contentType: file.type },
      })

      // 2. PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!putRes.ok) throw new Error(messages.media.s3UploadFailed)

      // Abort fake progress, jump to 100
      abortCtrl.abort()
      await progressPromise

      setJobField(index, { progress: 100 })

      // 3. Create DB record
      const result = await createMediaItemFn({
        data: {
          name: file.name.replace(/\.[^.]+$/, ''),
          type: detectMediaType(file.type),
          url: fileUrl,
          s3_key: s3Key,
          mime_type: file.type,
          size_bytes: file.size,
        },
      })

      if (!result.success) throw new Error(result.error ?? messages.media.dbSaveFailed)

      setJobField(index, { state: 'done', progress: 100 })
      onUploadComplete()
    } catch (err) {
      abortCtrl.abort()
      const message = err instanceof Error ? err.message : messages.media.unknownError
      setJobField(index, { state: 'error', error: message, progress: 0 })
    }
  }

  async function processFiles(files: File[]) {
    const newJobs: UploadJob[] = files.map((f) => ({
      fileName: f.name,
      progress: 0,
      state: 'idle',
    }))

    const startIndex = jobs.length
    setJobs((prev) => [...prev, ...newJobs])

    // Upload sequentially
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i], startIndex + i)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    processFiles(Array.from(files))
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const isUploading = jobs.some((j) => j.state === 'uploading')

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={messages.media.dropOrClickAria}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-150',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
          isUploading ? 'pointer-events-none opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <UploadCloud
          className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {messages.media.dropOrClick}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {messages.media.fileLimits}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Per-file progress list */}
      {jobs.length > 0 && (
        <ul className="space-y-2" aria-label={messages.media.uploadProgress}>
          {jobs.map((job, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                {job.state === 'done' && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                )}
                {job.state === 'error' && (
                  <XCircle
                    className="h-4 w-4 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                )}
                <p className="truncate text-sm font-medium text-foreground flex-1">
                  {job.fileName}
                </p>
                {job.state === 'done' && (
                  <span className="shrink-0 text-xs text-success">{messages.media.uploadDone}</span>
                )}
              </div>

              {job.state === 'uploading' && (
                <Progress
                  value={job.progress}
                  className="h-1.5"
                  aria-label={templates.media.uploadingProgress(job.fileName, job.progress)}
                />
              )}

              {job.state === 'error' && job.error && (
                <p className="text-xs text-destructive" role="alert">
                  {job.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
