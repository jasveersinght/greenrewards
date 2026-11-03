import { describe, it, expect } from 'vitest';
import {
  computeEntryHash,
  verifyLedgerChain,
  computeCanonicalString,
} from '@/server/domain/ledgerChain';

describe('Cryptographic Tamper-Evident Ledger', () => {
  const t0 = new Date('2026-11-01T10:00:00Z');
  const t1 = new Date('2026-11-01T10:05:00Z');
  const t2 = new Date('2026-11-01T10:10:00Z');

  it('builds a valid SHA-256 chain and validates successfully', () => {
    // Genesis entry
    const entry0 = {
      id: 'e0',
      transactionId: 'tx0',
      account: 'USER_PENDING',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t0,
      prevHash: null,
      hash: '',
    };
    entry0.hash = computeEntryHash(entry0);

    // Entry 1 pointing to entry 0
    const entry1 = {
      id: 'e1',
      transactionId: 'tx1',
      account: 'USER_AVAILABLE',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t1,
      prevHash: entry0.hash,
      hash: '',
    };
    entry1.hash = computeEntryHash(entry1);

    // Entry 2 pointing to entry 1
    const entry2 = {
      id: 'e2',
      transactionId: 'tx2',
      account: 'USER_AVAILABLE',
      entrySide: 'DEBIT',
      amountPoints: 30,
      createdAt: t2,
      prevHash: entry1.hash,
      hash: '',
    };
    entry2.hash = computeEntryHash(entry2);

    const check = verifyLedgerChain([entry0, entry1, entry2]);
    expect(check.valid).toBe(true);
    expect(check.mismatchIndex).toBeUndefined();
  });

  it('detects tampering when an entry payload (amountPoints) is altered', () => {
    const entry0 = {
      id: 'e0',
      transactionId: 'tx0',
      account: 'USER_PENDING',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t0,
      prevHash: null,
      hash: '',
    };
    entry0.hash = computeEntryHash(entry0);

    const entry1 = {
      id: 'e1',
      transactionId: 'tx1',
      account: 'USER_AVAILABLE',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t1,
      prevHash: entry0.hash,
      hash: '',
    };
    entry1.hash = computeEntryHash(entry1);

    // Tamper: attacker changes e0 amount from 50 to 500 without updating hash
    const tamperedEntry0 = { ...entry0, amountPoints: 500 };

    const check = verifyLedgerChain([tamperedEntry0, entry1]);
    expect(check.valid).toBe(false);
    expect(check.mismatchIndex).toBe(0);
    expect(check.error).toContain('Computed hash does not match');
  });

  it('detects broken chain link when prevHash does not match previous entry hash', () => {
    const entry0 = {
      id: 'e0',
      transactionId: 'tx0',
      account: 'USER_PENDING',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t0,
      prevHash: null,
      hash: '',
    };
    entry0.hash = computeEntryHash(entry0);

    const entry1 = {
      id: 'e1',
      transactionId: 'tx1',
      account: 'USER_AVAILABLE',
      entrySide: 'CREDIT',
      amountPoints: 50,
      createdAt: t1,
      prevHash: 'invalid-fake-prev-hash-hex',
      hash: '',
    };
    entry1.hash = computeEntryHash(entry1);

    const check = verifyLedgerChain([entry0, entry1]);
    expect(check.valid).toBe(false);
    expect(check.mismatchIndex).toBe(1);
    expect(check.error?.toLowerCase()).toContain('broken chain link');
  });
});
