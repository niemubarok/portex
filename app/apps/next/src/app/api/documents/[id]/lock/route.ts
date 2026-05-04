import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { addWatermarkAndQR } from '@/lib/pdf-next'
import fs from 'fs'
import path from 'path'

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
    
    // Only Admin, Manager or Officer can lock
    if (user.role !== 'OFFICER' && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: { message: 'Permission denied' } }, { status: 403 })
    }

    const { id } = await params
    const document = await prisma.document.findUnique({ where: { id, deletedAt: null } })
    if (!document) return NextResponse.json({ error: { message: 'Document not found' } }, { status: 404 })

    if (document.status !== 'Approved') {
      return NextResponse.json({ error: { message: 'Only approved documents can be locked' } }, { status: 400 })
    }

    // Process PO File (Watermark and QR)
    // For this migration, I'll assume local storage first to keep it simple
    // If it's S3, I would need to download and re-upload
    const isLocal = process.env.STORAGE_TYPE === 'local'
    let poBuffer: Buffer

    if (isLocal) {
      const fullPath = path.join(process.cwd(), 'public', document.poPath)
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: { message: 'PO file not found in storage' } }, { status: 404 })
      }
      poBuffer = fs.readFileSync(fullPath)
    } else {
      // S3 Logic here... (Skipping for now to prioritize local deployment)
      return NextResponse.json({ error: { message: 'S3 storage not yet fully implemented in lock action' } }, { status: 501 })
    }

    const qrText = `PORTEX-DOC-${document.id}`
    
    // Fetch watermark setting
    const watermarkSetting = await prisma.setting.findUnique({ where: { key: 'watermark_text' } })
    let watermarkTemplate = watermarkSetting?.value || 'LOCKED BY {user} - {date}'
    
    const watermarkText = watermarkTemplate
      .replace('{user}', `${user.firstName} ${user.lastName}`.toUpperCase())
      .replace('{date}', new Date().toLocaleDateString('id-ID'))
      .replace('{id}', document.id.substring(0, 8))
    
    const processedBuffer = await addWatermarkAndQR(poBuffer, qrText, watermarkText)

    if (isLocal) {
      const fullPath = path.join(process.cwd(), 'public', document.poPath)
      fs.writeFileSync(fullPath, processedBuffer)
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'Locked',
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'LOCK_DOCUMENT',
        userId: user.id,
        documentId: id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Locked and watermarked document: ${document.title}`,
      },
    })

    return NextResponse.json({ data: updatedDocument })
  } catch (error: any) {
    console.error('Lock error:', error)
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 })
  }
}
