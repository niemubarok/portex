import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { uploadFile } from '@/lib/storage-next'

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
    const document = await prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

    const { id } = await params
    const document = await prisma.document.findUnique({ where: { id, deletedAt: null } })

    if (!document) {
      return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })
    }

    // Permission check: only admin or uploader can edit, and only if status is Draft
    const isAdmin = user.role === 'ADMIN'
    const isOwner = document.uploaderId === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }
    if (document.status !== 'Draft') {
      return NextResponse.json({ error: { message: 'Only draft documents can be edited' } }, { status: 400 })
    }

    const formData = await req.formData()
    const title = formData.get('title') as string
    const notes = formData.get('notes') as string

    const updateData: any = {
      title: title || document.title,
      notes: notes !== null ? notes : document.notes,
    }

    const fileFields = ['po_file', 'invoice_file', 'packing_list_file', 'peb_file', 'bl_file', 'other_file']
    for (const field of fileFields) {
      const file = formData.get(field) as File | null
      if (file && file.size > 0) {
        const folder = field.replace('_file', '')
        updateData[field.replace('_file', 'Path')] = await uploadFile(file, folder)
      }
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_DOCUMENT',
        userId: user.id,
        documentId: id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Updated document: ${updatedDocument.title}`,
      },
    })

    return NextResponse.json({ data: updatedDocument })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

    const { id } = await params
    const document = await prisma.document.findUnique({ where: { id, deletedAt: null } })

    if (!document) {
      return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })
    }

    // Permission check
    const isAdmin = user.role === 'ADMIN'
    const isOwner = document.uploaderId === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }
    if (document.status !== 'Draft' && !isAdmin) {
      return NextResponse.json({ error: { message: 'Only draft documents can be deleted' } }, { status: 400 })
    }

    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_DOCUMENT',
        userId: user.id,
        documentId: id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Deleted document: ${document.title}`,
      },
    })

    return NextResponse.json({ message: 'Document deleted' })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
