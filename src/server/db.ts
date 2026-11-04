import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

function createPrismaClient() {
  // Resolve the DB path relative to the project root (works in both dev & prod)
  const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
  const dbPath = dbUrl.replace(/^file:/, '')
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbPath)

  const adapter = new PrismaBetterSqlite3({ url: absolutePath })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
