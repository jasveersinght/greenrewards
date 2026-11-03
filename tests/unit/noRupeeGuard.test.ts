import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  POINTS_CONFIG,
  SECTION_REWARD_LABELS,
  SECTION_REWARD_BADGES,
} from '@/server/domain/pointsConfig';

const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const SEED_FILE = path.join(ROOT_DIR, 'prisma/seed.ts');

// Allowlist regexes for legitimate financial uses:
// 1. Food listing prices (original price, discounted price)
// 2. Electricity bill actual amounts and bill savings predictions
// 3. Coupon catalog item face values (e.g. "₹30 off on ₹300+")
// 4. Admin/Sponsor internal funding budget (paise)
const ALLOWLIST_PATTERNS = [
  /discountedPrice/i,
  /originalPrice/i,
  /unitPrice/i,
  /totalPrice/i,
  /listing\.(discountedPrice|originalPrice)/i,
  /b\.amountPaise/i,
  /amountRupees/i,
  /predictedBillRupees/i,
  /potentialSavingsRupees/i,
  /impactRupees/i,
  /breakdown\.(baseFixed|airConditioning|appliancesAndTv|occupancyLoad|urbanDensityFactor|areaFactor)/i,
  /Bill Amount/i,
  /amountPaise/i,
  /faceValueText/i,
  /minSpendText/i,
  /faceValue/i,
  /coupon/i,
  /Off on/i,
  /Off Super Saver/i,
  /Off Eco-Friendly/i,
  /Off Organic/i,
  /Free Cold-Pressed/i,
  /Free Juice/i,
  /budgetTotalPaise/i,
  /totalPaise/i,
  /₹49 meal/i, // Specific real price of Annapoorna meal listing
  /rec\.impactRupees/i,
  /currency/i,
  // Coupon descriptions in Rewards Store & seed catalog
  /Save ₹\d+/i,
  /Redeem for ₹\d+/i,
  /up to ₹\d+ off/i,
  /Enjoy ₹\d+ savings/i,
  /₹\d+ menu value/i,
  /spending ₹\d+/i,
  // Admin-only internal funder sponsor budgets
  /placeholder=.*₹/i,
  /budgetTotalPaise/i,
];

function isAllowlisted(line: string, filePath?: string): boolean {
  if (filePath && /src[\\/]app[\\/]admin[\\/]campaigns/i.test(filePath)) {
    return true; // Admin internal sponsor budget configuration
  }
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(line));
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'generated') {
        getAllFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      if (!fullPath.includes('tests')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe('Guard: No Rupee Rewards in Codebase', () => {
  it('strictly prohibits ₹, Rs, INR, or rupee in reward descriptions and badges', () => {
    const targetFiles = getAllFiles(SRC_DIR);
    if (fs.existsSync(SEED_FILE)) {
      targetFiles.push(SEED_FILE);
    }

    const forbiddenRegex = /([₹]|(?:\b(?:Rs\.?|INR|rupees?)\b))/i;
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const filePath of targetFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (forbiddenRegex.test(line)) {
          if (!isAllowlisted(line, filePath)) {
            violations.push({
              file: path.relative(ROOT_DIR, filePath),
              line: index + 1,
              text: line.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      console.error('Found forbidden rupee/currency reward violations:', violations);
    }

    expect(violations).toEqual([]);
  });

  it('verifies that pointsConfig canonical reward labels contain NO monetary symbols', () => {
    const forbidden = /([₹]|(?:\b(?:Rs\.?|INR|rupees?)\b))/i;

    Object.entries(SECTION_REWARD_LABELS).forEach(([key, label]) => {
      expect(label).not.toMatch(forbidden);
      expect(label.toLowerCase()).toMatch(/pts|points/);
    });

    Object.entries(SECTION_REWARD_BADGES).forEach(([key, badge]) => {
      expect(badge).not.toMatch(forbidden);
      expect(badge.toLowerCase()).toMatch(/pts|gp/);
    });
  });

  it('verifies exact canonical reward labels matching pointsConfig rules', () => {
    expect(SECTION_REWARD_LABELS.REUSE).toBe('10 pts per stamp · +40 bonus at 5 stamps');
    expect(SECTION_REWARD_LABELS.LEAK).toBe('50 pts accepted · +100 when repaired');
    expect(SECTION_REWARD_LABELS.FOOD).toBe('15 pts per pickup');
    expect(SECTION_REWARD_LABELS.COMMUTE).toBe('5 pts per trip · +25 for 5 trips/week');
    expect(SECTION_REWARD_LABELS.ELECTRICITY).toBe('150 pts for 10% less vs your own bills');
    expect(SECTION_REWARD_LABELS.WATER).toBe('75 pts per verified repair');

    // Verify points config earning values
    expect(POINTS_CONFIG.EARNING.REUSE_STAMP).toBe(10);
    expect(POINTS_CONFIG.EARNING.REUSE_CARD_BONUS).toBe(40);
    expect(POINTS_CONFIG.EARNING.LEAK_REPORT_ACCEPTED).toBe(50);
    expect(POINTS_CONFIG.EARNING.LEAK_REPAIR_VERIFIED).toBe(100);
    expect(POINTS_CONFIG.EARNING.FOOD_PICKUP_COMPLETED).toBe(15);
    expect(POINTS_CONFIG.EARNING.TRANSIT_TRIP_REVIEWED).toBe(5);
    expect(POINTS_CONFIG.EARNING.TRANSIT_STREAK_BONUS).toBe(25);
    expect(POINTS_CONFIG.EARNING.ELECTRICITY_10PCT_REDUCTION).toBe(150);
    expect(POINTS_CONFIG.EARNING.HOUSEHOLD_WATER_REPAIR_VERIFIED).toBe(75);
  });
});
