'use client'

import { useRef, useState, useCallback, useId } from 'react'
import { Progress } from '@agency/ui'
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react'
import { createMediaItem } from '../actions'
import type { MediaType } from '../types'
import { ALLOWED_MIME_TYPES, IMAGE_MAX_SIZE, VIDEO_MAX_SIZE } from '../utils'

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
        error: 'Niedozwolony typ pliku.',
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
        error: `Plik za duży. Max: ${limitMB}MB.`,
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

      // 1. Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'haloefekt/media',
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Błąd generowania URL uploadu')
      }

      const { uploadUrl, fileUrl, s3Key } = await res.json()

      // 2. PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!putRes.ok) throw new Error('Upload do S3 nie powiódł się')

      // Abort fake progress, jump to 100
      abortCtrl.abort()
      await progressPromise

      setJobField(index, { progress: 100 })

      // 3. Create DB record
      const result = await createMediaItem({
        name: file.name.replace(/\.[^.]+$/, ''),
        type: detectMediaType(file.type),
        url: fileUrl,
        s3_key: s3Key,
        mime_type: file.type,
        size_bytes: file.size,
      })

      if (!result.success) throw new Error(result.error ?? 'Błąd zapisu do bazy')

      setJobField(index, { state: 'done', progress: 100 })
      onUploadComplete()
    } catch (err) {
      abortCtrl.abort()
      const message = err instanceof Error ? err.message : 'Nieznany błąd'
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
        aria-label="Strefa przesyłania plików. Przeciągnij pliki lub naciśnij Enter aby wybrać."
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
            Przeciągnij pliki lub kliknij aby wybrać
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Obrazy (max 5MB), Wideo (max 50MB)
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
        <ul className="space-y-2" aria-label="Postęp przesyłania">
          {jobs.map((job, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                {job.state === 'done' && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-green-500"
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
                  <span className="shrink-0 text-xs text-green-500">Gotowe</span>
                )}
              </div>

              {job.state === 'uploading' && (
                <Progress
                  value={job.progress}
                  className="h-1.5"
                  aria-label={`Przesyłanie ${job.fileName}: ${job.progress}%`}
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
