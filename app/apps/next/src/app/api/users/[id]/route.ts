import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

async function getAuthUser(req: Request | NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token) as any
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await getAuthUser(req)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { first_name, last_name, email, password, role, active } = body

    const user = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!user) return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })

    const updateData: any = {
      firstName: first_name || user.firstName,
      lastName: last_name || user.lastName,
      email: email || user.email,
      role: role || user.role,
      active: active !== undefined ? active : user.active,
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER',
        userId: adminUser.id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Updated user: ${updatedUser.email}`,
      },
    })

    const { password: _, ...userWithoutPassword } = updatedUser
    return NextResponse.json({ data: userWithoutPassword })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await getAuthUser(req)
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { id } = await params
    if (id === adminUser.id) {
      return NextResponse.json({ error: { message: 'You cannot delete yourself' } }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!user) return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        userId: adminUser.id,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: `Deleted user: ${user.email}`,
      },
    })

    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
