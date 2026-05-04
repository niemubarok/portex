import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token) as any
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: users })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getAuthUser(req)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await req.json()
    const { first_name, last_name, email, password, role, active } = body

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required' } }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: { message: 'Email already exists' } }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        firstName: first_name,
        lastName: last_name,
        email,
        password: hashedPassword,
        role: role || 'OFFICER',
        active: active !== undefined ? active : true,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        userId: adminUser.id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Created user: ${email}`,
      },
    })

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ data: userWithoutPassword })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
