import { describe, it, expect } from 'vitest';
import {
  isCompanyDealTransitionAllowed,
  getCompanyDealNextStatuses,
  isOperatorDealTransitionAllowed,
  isDealType
} from '@/lib/deal/status';
import {
  isTeaserPublishableStatus,
  isOperatorTransitionAllowed
} from '@/lib/invention/status';

describe('企業主導の deal 遷移', () => {
  it('許可された遷移のみ true', () => {
    expect(isCompanyDealTransitionAllowed('interested', 'nda_requested')).toBe(true);
    expect(isCompanyDealTransitionAllowed('nda_requested', 'nda_accepted')).toBe(true);
  });

  it('運営専権の遷移は企業には不可', () => {
    // licensed 等の確定遷移は企業の選択肢に含まれない
    expect(isCompanyDealTransitionAllowed('negotiating', 'licensed')).toBe(false);
    expect(isCompanyDealTransitionAllowed('interested', 'negotiating')).toBe(false);
  });

  it('未知の現在状態では遷移先が空', () => {
    expect(getCompanyDealNextStatuses('bogus')).toEqual([]);
  });
});

describe('運営の deal 遷移', () => {
  it('運営は negotiating から確定遷移できる', () => {
    expect(isOperatorDealTransitionAllowed('negotiating', 'licensed')).toBe(true);
  });
});

describe('isDealType', () => {
  it('既知の取引種別のみ true', () => {
    expect(isDealType('exclusive_license')).toBe(true);
    expect(isDealType('complete_transfer')).toBe(true);
    expect(isDealType('not_a_type')).toBe(false);
  });
});

describe('ティザー公開可否', () => {
  it('内部審査完了〜企業開示準備のみ公開可', () => {
    expect(isTeaserPublishableStatus('attorney_review_ready')).toBe(true);
    expect(isTeaserPublishableStatus('company_disclosure_ready')).toBe(true);
    expect(isTeaserPublishableStatus('draft')).toBe(false);
    expect(isTeaserPublishableStatus('screening')).toBe(false);
  });
});

describe('発明ステータス遷移', () => {
  it('ライフサイクルに沿う遷移のみ許可する', () => {
    expect(isOperatorTransitionAllowed('submitted', 'screening')).toBe(true);
    expect(isOperatorTransitionAllowed('screening', 'licensed')).toBe(false);
  });
});
