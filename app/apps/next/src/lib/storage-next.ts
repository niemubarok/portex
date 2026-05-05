import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { getSupabaseServer } from './supabase'

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents'

export async function uploadFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const ext = path.extname(file.name)
  const filename = `${uuidv4()}${ext}`
  const targetPath = `${folder}/${filename}`

  const supabase = getSupabaseServer()
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(targetPath, buffer, {
      contentType: file.type,
      upsert: true
    })

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`)
  }

  return data.path
}

export function getFileUrl(filePath: string): string {
  const supabase = getSupabaseServer()
  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath)
    
  return data.publicUrl
}

