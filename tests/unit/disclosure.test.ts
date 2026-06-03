import { describe, it, expect } from 'vitest';
import {
  disclosureLevelRank,
  disclosureRequiresNda,
  isDisclosureApprovalActive,
  isDisclosureLevel
} from '@/lib/company/disclosure';

describe('disclosureLevelRank', () => {
  it('レベルを 0〜4 で単調に順位付けする', () => {
    expect(disclosureLevelRank('level_0_internal_only')).toBe(0);
    expect(disclosureLevelRank('level_1_company_teaser')).toBe(1);
    expect(disclosureLevelRank('level_2_nda_summary')).toBe(2);
    expect(disclosureLevelRank('level_3_nda_detail')).toBe(3);
    expect(disclosureLevelRank('level_4_negotiation_package')).toBe(4);
  });

  it('不明値/未設定は 0 にフォールバックする', () => {
    expect(disclosureLevelRank(null)).toBe(0);
    expect(disclosureLevelRank(undefined)).toBe(0);
    expect(disclosureLevelRank('bogus')).toBe(0);
  });
});

describe('disclosureRequiresNda', () => {
  it('level_2 以上で NDA を要求する', () => {
    expect(disclosureRequiresNda('level_1_company_teaser')).toBe(false);
    expect(disclosureRequiresNda('level_2_nda_summary')).toBe(true);
    expect(disclosureRequiresNda('level_4_negotiation_package')).toBe(true);
  });
});

describe('isDisclosureLevel', () => {
  it('既知レベルのみ true', () => {
    expect(isDisclosureLevel('level_3_nda_detail')).toBe(true);
    expect(isDisclosureLevel('level_9')).toBe(false);
  });
});

describe('isDisclosureApprovalActive（期限付き自動失効）', () => {
  const now = new Date('2026-06-04T00:00:00Z');

  it('expires_at 未設定は無期限で有効', () => {
    expect(isDisclosureApprovalActive(null, now)).toBe(true);
    expect(isDisclosureApprovalActive(undefined, now)).toBe(true);
  });

  it('未来の期限は有効、過去の期限は失効', () => {
    expect(isDisclosureApprovalActive('2026-06-05T00:00:00Z', now)).toBe(true);
    expect(isDisclosureApprovalActive('2026-06-03T23:59:59Z', now)).toBe(false);
  });

  it('解釈不能な値は安全側（失効）', () => {
    expect(isDisclosureApprovalActive('not-a-date', now)).toBe(false);
  });
});
