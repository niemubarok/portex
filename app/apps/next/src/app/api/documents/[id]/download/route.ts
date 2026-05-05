import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import path from 'path'
import { getSupabaseServer } from '@/lib/supabase'

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents'

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token) as any
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const document = await prisma.document.findUnique({ where: { id, deletedAt: null } })
    if (!document) return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })

    let filePath: string | null = null
    switch (type) {
      case 'po': filePath = document.poPath; break
      case 'invoice': filePath = document.invoicePath; break
      case 'packing_list': filePath = document.packingListPath; break
      case 'peb': filePath = document.pebPath; break
      case 'bl': filePath = document.blPath; break
      case 'other': filePath = document.otherPath; break
    }

    if (!filePath) {
      return NextResponse.json({ error: { message: 'File type not found' } }, { status: 404 })
    }

    const supabase = getSupabaseServer()
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(filePath)

    if (error || !data) {
      return NextResponse.json({ error: { message: 'File not found in storage' } }, { status: 404 })
    }

    const arrayBuffer = await data.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const fileName = path.basename(filePath)
    
    await prisma.auditLog.create({
      data: {
        action: 'DOWNLOAD_DOCUMENT',
        userId: user.id,
        documentId: id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Downloaded ${type} file of document: ${document.title}`,
      },
    })

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
