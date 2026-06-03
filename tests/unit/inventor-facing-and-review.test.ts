import { describe, expect, it } from 'vitest';
import {
  inventorFacingStatusLabel,
  inventionStatusLabel,
  INVENTOR_FACING_STATUS_LABELS
} from '@/lib/invention/status';
import {
  isCompanyReviewAction,
  companyReviewStatusLabel,
  COMPANY_REVIEW_ACTIONS,
  COMPANY_REVIEW_STATUSES
} from '@/lib/company/review';

// 発明者へ「審査中」にマスクすべき内部フェーズ（state machine doc §7）。
// これらの内部名が発明者向けラベルに漏れないことを保証する。
const MASKED_INTERNAL_PHASES = [
  'ip_strategy_review',
  'prototype_review',
  'attorney_review_ready',
  'company_disclosure_ready'
];

describe('inventorFacingStatusLabel（内部フェーズの漏洩防止）', () => {
  it('内部フェーズはすべて「審査中」にマスクされる', () => {
    for (const phase of MASKED_INTERNAL_PHASES) {
      expect(inventorFacingStatusLabel(phase)).toBe('審査中');
    }
  });

  it('未知のステータスも安全側で「審査中」（生の値を出さない）', () => {
    expect(inventorFacingStatusLabel('some_new_internal_phase')).toBe('審査中');
  });

  it('null / 空は「未設定」', () => {
    expect(inventorFacingStatusLabel(null)).toBe('未設定');
    expect(inventorFacingStatusLabel(undefined)).toBe('未設定');
    expect(inventorFacingStatusLabel('')).toBe('未設定');
  });

  it('発明者に見せてよい成立系ステータスは実体ラベルで表示される', () => {
    expect(inventorFacingStatusLabel('licensed')).toBe('ライセンス成立');
    expect(inventorFacingStatusLabel('assigned')).toBe('譲渡成立');
    expect(inventorFacingStatusLabel('joint_development')).toBe('共同開発成立');
    expect(inventorFacingStatusLabel('rejected')).toBe('見送り');
  });

  it('発明者向けラベルには operator 内部フェーズの英語キー名が一切現れない', () => {
    const allLabels = Object.values(INVENTOR_FACING_STATUS_LABELS).join(' ');
    for (const phase of MASKED_INTERNAL_PHASES) {
      expect(allLabels).not.toContain(phase);
    }
  });
});

describe('inventionStatusLabel（operator 向けは実体表示）', () => {
  it('内部フェーズは operator 向けには実ラベルが出る（発明者向けと挙動が異なる）', () => {
    // operator 向けはマスクしない。発明者向けと同じ「審査中」固定ではない。
    expect(inventionStatusLabel('attorney_review_ready')).not.toBe('未設定');
    expect(inventionStatusLabel(null)).toBe('未設定');
    // 未知値は operator 向けでは生値を素通し（発明者向けの「審査中」と対照的）。
    expect(inventionStatusLabel('mystery')).toBe('mystery');
  });
});

describe('company review ガード/ラベル', () => {
  it('isCompanyReviewAction は approved/rejected/suspended のみ true（pending は不可）', () => {
    for (const a of COMPANY_REVIEW_ACTIONS) {
      expect(isCompanyReviewAction(a)).toBe(true);
    }
    expect(isCompanyReviewAction('pending')).toBe(false);
    expect(isCompanyReviewAction('deleted')).toBe(false);
    expect(isCompanyReviewAction('')).toBe(false);
  });

  it('COMPANY_REVIEW_ACTIONS は pending を含まない（初期状態へは戻せない）', () => {
    expect(COMPANY_REVIEW_ACTIONS).not.toContain('pending');
    expect(COMPANY_REVIEW_STATUSES).toContain('pending');
  });

  it('companyReviewStatusLabel は null/空で「未設定」、未知は素通し、既知は日本語化', () => {
    expect(companyReviewStatusLabel(null)).toBe('未設定');
    expect(companyReviewStatusLabel('')).toBe('未設定');
    expect(companyReviewStatusLabel('weird')).toBe('weird');
    expect(companyReviewStatusLabel('approved')).toBe('承認済み');
    expect(companyReviewStatusLabel('suspended')).toBe('停止中');
  });
});
