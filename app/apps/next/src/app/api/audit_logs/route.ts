import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token) as any
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('document_id') || searchParams.get('documentId')

    if (user.role !== 'ADMIN' && user.role !== 'AUDITOR' && !documentId) {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }

    const search = searchParams.get('search')
    const action = searchParams.get('action')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    const where: any = {
      deletedAt: null,
    }

    if (documentId) {
      where.documentId = documentId
    }

    if (search) {
      where.OR = [
        { details: { contains: search } },
        { ipAddress: { contains: search } },
      ]
    }

    if (action) {
      if (action === 'APPROVE') {
        where.action = 'APPROVE_LEVEL_1'
      } else if (action === 'LOCK') {
        where.action = 'APPROVE_FINAL'
      } else if (['UPLOAD', 'UPDATE', 'DOWNLOAD', 'VIEW'].includes(action)) {
        where.action = `${action}_DOCUMENT`
      } else {
        where.action = action
      }
    }

    if (start_date || end_date) {
      where.createdAt = {}
      if (start_date) where.createdAt.gte = new Date(start_date)
      if (end_date) where.createdAt.lte = new Date(end_date)
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ data: logs })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
