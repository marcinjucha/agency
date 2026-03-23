import { S3Client } from '@aws-sdk/client-s3'

export const S3_BUCKET = 'legal-mind-bucket'
export const S3_REGION = 'eu-central-1'

export function getS3Client() {
  return new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.BUCKET_ACCESS_KEY!,
      secretAccessKey: process.env.BUCKET_SECRET_KEY!,
    },
  })
}
