import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { getSupabaseServer } from '@/lib/supabase'
import { addDigitalSignature } from '@/lib/pdf-next'

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents'

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token) as any
  if (!decoded || !decoded.id) return null
  return prisma.user.findUnique({ where: { id: decoded.id } })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    
    // Only Manager or Admin can approve
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }

    const { id } = await params
    let notes = ''
    
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      notes = formData.get('manager_notes') as string || ''
    } else {
      const body = await req.json()
      notes = body.notes || body.manager_notes || ''
    }

    const document = await prisma.document.findUnique({ where: { id, deletedAt: null } })
    if (!document) return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })

    if (document.status !== 'Draft') {
      return NextResponse.json({ error: { message: 'Document is already approved or locked' } }, { status: 400 })
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'Approved',
        managerNotes: notes,
      },
    })

    // Process PO File (Add Digital Signature)
    try {
      const supabase = getSupabaseServer()
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .download(document.poPath)

      if (!downloadError && fileData) {
        const arrayBuffer = await fileData.arrayBuffer()
        const poBuffer = Buffer.from(arrayBuffer)

        const host = req.headers.get('host') || 'portex.app'
        const protocol = req.headers.get('x-forwarded-proto') || 'http'
        const qrText = `${protocol}://${host}/documents/${document.id}`
        const signerName = `${user.firstName} ${user.lastName}`
        const signerRole = user.role === 'ADMIN' ? 'IT Administrator' : 'Manager of Sales Export'
        const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

        const processedBuffer = await addDigitalSignature(poBuffer, qrText, signerName, signerRole, dateStr)

        // Re-upload to Supabase (overwrite)
        await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(document.poPath, processedBuffer, {
            contentType: 'application/pdf',
            upsert: true
          })
      }
    } catch (pdfError) {
      console.error('Failed to apply digital signature:', pdfError)
      // Continue anyway as the DB is already updated
    }

    await prisma.auditLog.create({
      data: {
        action: 'APPROVE_LEVEL_1',
        userId: user.id,
        documentId: id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Dokumen disetujui oleh ${user.role}${notes ? ` | Catatan: ${notes}` : ''}`,
      },
    })

    return NextResponse.json({ data: updatedDocument })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
