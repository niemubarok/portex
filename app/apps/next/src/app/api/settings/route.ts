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
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })

    const settings = await prisma.setting.findMany()
    return NextResponse.json({ data: settings })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { key, value } = await req.json()
    if (!key) return NextResponse.json({ error: { message: 'Key is required' } }, { status: 400 })

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SETTING',
        userId: user.id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Memperbarui pengaturan: ${key}`,
      },
    })

    return NextResponse.json({ data: setting })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
