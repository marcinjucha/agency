import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const BUCKET = 'legal-mind-bucket'
const REGION = 'eu-central-1'
const DEFAULT_FOLDER = 'haloefekt/blog'

function getS3Client() {
  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.BUCKET_ACCESS_KEY!,
      secretAccessKey: process.env.BUCKET_SECRET_KEY!,
    },
  })
}

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

    const key = `${folder}/${Date.now()}-${randomUUID()}-${fileName}`

    const s3 = getS3Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 })
    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

    return NextResponse.json({ uploadUrl, fileUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload URL generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
