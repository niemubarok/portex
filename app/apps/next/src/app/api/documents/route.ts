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

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const status = searchParams.get('status')

    const where: any = {
      deletedAt: null,
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { notes: { contains: q } },
      ]
    }

    if (status) {
      where.status = status
    }

    // Role-based filtering
    if (user.role === 'OFFICER') {
      where.uploaderId = user.id
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    if (user.role === 'MANAGER' || user.role === 'AUDITOR') {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }

    const formData = await req.formData()
    const title = formData.get('title') as string
    const notes = formData.get('notes') as string
    
    if (!title) {
      return NextResponse.json({ error: { message: 'Title is required' } }, { status: 400 })
    }

    const files: Record<string, string> = {}
    const fileFields = ['po_file', 'invoice_file', 'packing_list_file', 'peb_file', 'bl_file', 'other_file']
    
    for (const field of fileFields) {
      const file = formData.get(field) as File | null
      if (file && file.size > 0) {
        const folder = field.replace('_file', '')
        files[field.replace('_file', 'Path')] = await uploadFile(file, folder)
      }
    }

    if (!files.poPath) {
      return NextResponse.json({ error: { message: 'PO file is required' } }, { status: 400 })
    }

    // Get default retention from settings
    const retentionSetting = await prisma.setting.findUnique({ where: { key: 'retention_years' } })
    const retentionYears = parseInt(retentionSetting?.value || '10')

    const document = await prisma.document.create({
      data: {
        title,
        notes,
        status: 'Draft',
        uploaderId: user.id,
        retentionYears,
        poPath: files.poPath,
        invoicePath: files.invoicePath,
        packingListPath: files.packingListPath,
        pebPath: files.pebPath,
        blPath: files.blPath,
        otherPath: files.otherPath,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD_DOCUMENT',
        userId: user.id,
        documentId: document.id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Uploaded document: ${title}`,
      },
    })

    return NextResponse.json({ data: document })
  } catch (error) {
    console.error('Create document error:', error)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
