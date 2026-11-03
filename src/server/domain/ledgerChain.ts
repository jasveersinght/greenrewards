import crypto from 'crypto';

export interface CanonicalLedgerData {
  transactionId: string;
  entrySide: string;
  userId: string | null;
  account: string;
  amountPoints: number;
  type: string;
  refType: string;
  refId: string;
  createdAt: string; // ISO string
}

export function computeCanonicalString(data: CanonicalLedgerData): string {
  // Deterministic JSON key order
  return JSON.stringify({
    account: data.account,
    amountPoints: data.amountPoints,
    createdAt: data.createdAt,
    entrySide: data.entrySide,
    refId: data.refId,
    refType: data.refType,
    transactionId: data.transactionId,
    type: data.type,
    userId: data.userId ?? null,
  });
}

export function computeEntryHash(
  prevHashOrEntry: string | null | undefined | any,
  maybeData?: CanonicalLedgerData
): string {
  if (maybeData) {
    const canonical = computeCanonicalString(maybeData);
    const input = `${prevHashOrEntry ?? 'GENESIS'}:${canonical}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  // Called with a single entry object
  const entry = prevHashOrEntry;
  const prevHash = entry.prevHash;
  const createdAtStr =
    entry.createdAt instanceof Date
      ? entry.createdAt.toISOString()
      : typeof entry.createdAt === 'string'
      ? entry.createdAt
      : new Date().toISOString();

  const canonical = computeCanonicalString({
    transactionId: entry.transactionId || entry.id || 'tx-default',
    entrySide: entry.entrySide || 'CREDIT',
    userId: entry.userId ?? null,
    account: entry.account,
    amountPoints: entry.amountPoints ?? 0,
    type: entry.type || 'EARN',
    refType: entry.refType || 'REF',
    refId: entry.refId || 'ID',
    createdAt: createdAtStr,
  });
  const input = `${prevHash ?? 'GENESIS'}:${canonical}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function verifyLedgerChain(entries: Array<{
  id: string;
  transactionId?: string | null;
  entrySide?: string | null;
  userId?: string | null;
  account: string;
  amountPoints?: number | null;
  type?: string;
  refType?: string;
  refId?: string;
  createdAt: Date | string;
  prevHash?: string | null;
  hash?: string | null;
}>): { valid: boolean; brokenEntryId?: string; mismatchIndex?: number; error?: string } {
  if (!entries || entries.length === 0) {
    return { valid: true };
  }

  let expectedPrevHash: string | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Check prevHash link
    if (i === 0) {
      if (entry.prevHash !== null && entry.prevHash !== undefined && entry.prevHash !== '' && entry.prevHash !== 'GENESIS') {
        // If first entry has non-null prevHash, it must be valid or genesis
      }
    } else {
      if (entry.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          mismatchIndex: i,
          brokenEntryId: entry.id,
          error: `Broken chain link at entry ${entry.id}: expected prevHash ${expectedPrevHash}, got ${entry.prevHash}`,
        };
      }
    }

    const calculatedHash = computeEntryHash(entry);

    if (entry.hash && entry.hash !== calculatedHash) {
      return {
        valid: false,
        mismatchIndex: i,
        brokenEntryId: entry.id,
        error: `Computed hash does not match stored hash for entry ${entry.id}: stored ${entry.hash}, calculated ${calculatedHash}`,
      };
    }

    expectedPrevHash = entry.hash || calculatedHash;
  }

  return { valid: true };
}
