import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10)

  await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      password: hashedPassword,
    },
  })

  await prisma.user.create({
    data: {
      email: "user@example.com",
      name: "User",
      password: hashedPassword,
    },
  })

  console.log("✅ Seed data inserted")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
