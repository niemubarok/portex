import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

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
