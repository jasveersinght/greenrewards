/**
 * Wallet service — transactional ledger mutations.
 * All balance changes go through here. The ledger is append-only.
 */
import { prisma } from '@/server/db'
import { buildEntry, deriveBalance } from '@/server/domain/wallet'

export async function getWalletBalance(userId: string) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    select: { account: true, amountPaise: true, stamps: true, type: true },
    orderBy: { createdAt: 'asc' },
  })
  return deriveBalance(entries)
}

export async function getLedgerHistory(userId: string, params?: { skip?: number; take?: number }) {
  return prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: params?.skip ?? 0,
    take: params?.take ?? 50,
    include: { campaign: { select: { name: true, section: true } } },
  })
}

export async function addLedgerEntry(params: {
  userId: string
  account: string
  type: string
  refType: string
  refId: string
  amountPaise?: number
  stamps?: number
  campaignId?: string
  note?: string
}) {
  return prisma.ledgerEntry.create({
    data: buildEntry(params),
  })
}
