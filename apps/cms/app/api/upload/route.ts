import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { getS3Client, S3_BUCKET, S3_REGION } from '@/lib/s3'

const DEFAULT_FOLDER = 'haloefekt/blog'

const ALLOWED_FOLDERS = ['haloefekt/blog', 'haloefekt/media']
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nie zalogowany' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, contentType, folder = DEFAULT_FOLDER } = body as {
      fileName: string
      contentType: string
      folder?: string
    }

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Niedozwolony typ pliku. Dozwolone: JPEG, PNG, GIF, WebP, SVG, AVIF, MP4, WebM, MOV.' },
        { status: 400 }
      )
    }

    const sanitizedFolder = folder.replace(/\.\./g, '').replace(/^\/+/, '')
    if (!ALLOWED_FOLDERS.some((allowed) => sanitizedFolder.startsWith(allowed))) {
      return NextResponse.json(
        { error: 'Niedozwolony folder docelowy.' },
        { status: 400 }
      )
    }

    const key = `${sanitizedFolder}/${Date.now()}-${randomUUID()}-${fileName}`

    const s3 = getS3Client()
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const expiresIn = sanitizedFolder.startsWith('haloefekt/media') ? 300 : 60
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn })
    const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`

    return NextResponse.json({ uploadUrl, fileUrl, s3Key: key })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload URL generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
