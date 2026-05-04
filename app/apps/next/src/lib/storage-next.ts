import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

const isLocal = process.env.STORAGE_TYPE === 'local'

const s3Client = !isLocal ? new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
}) : null

export async function uploadFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const ext = path.extname(file.name)
  const filename = `${uuidv4()}${ext}`
  const targetPath = `${folder}/${filename}`

  if (isLocal) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const fullPath = path.join(uploadDir, filename)
    fs.writeFileSync(fullPath, buffer)
    return `uploads/${folder}/${filename}`
  } else {
    const parallelUploads3 = new Upload({
      client: s3Client!,
      params: {
        Bucket: process.env.S3_BUCKET || 'portex',
        Key: targetPath,
        Body: buffer,
        ContentType: file.type,
      },
    })

    await parallelUploads3.done()
    return targetPath
  }
}

export function getFileUrl(filePath: string): string {
  if (isLocal) {
    return `/${filePath}`
  }
  return `${process.env.S3_PUBLIC_URL || ''}/${filePath}`
}
