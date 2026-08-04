import '@tanstack/react-start/server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

declare global {
  var __gestorGastPrisma: PrismaClient | undefined
}

export function getPrisma() {
  if (globalThis.__gestorGastPrisma) return globalThis.__gestorGastPrisma

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__gestorGastPrisma = client
  }

  return client
}
