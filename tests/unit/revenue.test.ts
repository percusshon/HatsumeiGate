import { describe, it, expect } from 'vitest';
import {
  computeFeeSplit,
  DEFAULT_PLATFORM_FEE_RATE,
  formatAmount,
  isRevenueEventType
} from '@/lib/revenue/events';

describe('computeFeeSplit', () => {
  it('既定で 20% を手数料、残りを発明者取り分にする', () => {
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.2);
    const r = computeFeeSplit(100000);
    expect(r.platformFeeAmount).toBe(20000);
    expect(r.inventorAmount).toBe(80000);
    expect(r.rate).toBe(0.2);
  });

  it('手数料＋取り分が元金額に一致する（端数二桁丸め）', () => {
    const r = computeFeeSplit(100.05, 0.2);
    expect(r.platformFeeAmount + r.inventorAmount).toBeCloseTo(100.05, 2);
  });

  it('カスタム率を適用できる', () => {
    const r = computeFeeSplit(1000, 0.1);
    expect(r.platformFeeAmount).toBe(100);
    expect(r.inventorAmount).toBe(900);
  });
});

describe('formatAmount', () => {
  it('数値を桁区切り＋通貨で表示する', () => {
    expect(formatAmount(1000000, 'JPY')).toBe('1,000,000 JPY');
  });

  it('null/空/非数は — を返す', () => {
    expect(formatAmount(null, 'JPY')).toBe('—');
    expect(formatAmount('', 'JPY')).toBe('—');
    expect(formatAmount('abc', 'JPY')).toBe('—');
  });

  it('通貨未指定は JPY を既定にする', () => {
    expect(formatAmount(500, null)).toBe('500 JPY');
  });
});

describe('isRevenueEventType', () => {
  it('既知イベント種別のみ true', () => {
    expect(isRevenueEventType('success_fee')).toBe(true);
    expect(isRevenueEventType('unknown_fee')).toBe(false);
  });
});
