import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password', 10)

  // Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  })

  // Seed Demo Users
  const users = [
    { firstName: 'Officer', lastName: 'User', email: 'officer@example.com', password: hashedPassword, role: 'OFFICER', active: true },
    { firstName: 'Manager', lastName: 'User', email: 'manager@example.com', password: hashedPassword, role: 'MANAGER', active: true },
    { firstName: 'Auditor', lastName: 'User', email: 'auditor@example.com', password: hashedPassword, role: 'AUDITOR', active: true },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    })
  }

  // Seed Default Settings
  const settings = [
    { key: 'retention_years', value: '10' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
