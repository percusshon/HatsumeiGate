import { describe, expect, it } from 'vitest';
import {
  isScreeningRating,
  screeningAxisLabel,
  screeningRatingLabel,
  SCREENING_AXES,
  SCREENING_RATINGS
} from '@/lib/invention/screening';
import {
  isIpStrategyType,
  ipStrategyTypeLabel,
  isPriorArtRiskLevel,
  priorArtRiskLabel,
  IP_STRATEGY_TYPES,
  PRIOR_ART_RISK_LEVELS
} from '@/lib/invention/ip-strategy';
import {
  isDealType,
  dealStatusLabel,
  dealTypeLabel,
  DEAL_TYPES
} from '@/lib/deal/status';

describe('screening ガード/ラベル', () => {
  it('isScreeningRating は A-E のみ true', () => {
    for (const r of SCREENING_RATINGS) {
      expect(isScreeningRating(r)).toBe(true);
    }
    expect(isScreeningRating('F')).toBe(false);
    expect(isScreeningRating('')).toBe(false);
    expect(isScreeningRating('a')).toBe(false);
  });

  it('screeningAxisLabel は null/undefined/空で「未設定」', () => {
    expect(screeningAxisLabel(null)).toBe('未設定');
    expect(screeningAxisLabel(undefined)).toBe('未設定');
    expect(screeningAxisLabel('')).toBe('未設定');
  });

  it('screeningAxisLabel は既知軸を日本語化し、未知値は素通し', () => {
    for (const axis of SCREENING_AXES) {
      expect(screeningAxisLabel(axis)).not.toBe('未設定');
    }
    expect(screeningAxisLabel('unknown_axis')).toBe('unknown_axis');
  });

  it('screeningRatingLabel は null/空で「未判定」、未知値は素通し', () => {
    expect(screeningRatingLabel(null)).toBe('未判定');
    expect(screeningRatingLabel('')).toBe('未判定');
    expect(screeningRatingLabel('Z')).toBe('Z');
    for (const r of SCREENING_RATINGS) {
      expect(screeningRatingLabel(r)).not.toBe('未判定');
    }
  });
});

describe('ip-strategy ガード/ラベル', () => {
  it('isIpStrategyType は既知タイプのみ true', () => {
    for (const t of IP_STRATEGY_TYPES) {
      expect(isIpStrategyType(t)).toBe(true);
    }
    expect(isIpStrategyType('nonexistent')).toBe(false);
  });

  it('ipStrategyTypeLabel は null/空で「未設定」、既知は日本語化、未知は素通し', () => {
    expect(ipStrategyTypeLabel(null)).toBe('未設定');
    expect(ipStrategyTypeLabel('')).toBe('未設定');
    expect(ipStrategyTypeLabel('weird')).toBe('weird');
    for (const t of IP_STRATEGY_TYPES) {
      expect(ipStrategyTypeLabel(t)).not.toBe('未設定');
    }
  });

  it('isPriorArtRiskLevel は low/medium/high のみ true', () => {
    for (const lv of PRIOR_ART_RISK_LEVELS) {
      expect(isPriorArtRiskLevel(lv)).toBe(true);
    }
    expect(isPriorArtRiskLevel('critical')).toBe(false);
    expect(isPriorArtRiskLevel('LOW')).toBe(false);
  });

  it('priorArtRiskLabel は low/medium/high を低/中/高、null で「未設定」', () => {
    expect(priorArtRiskLabel('low')).toBe('低');
    expect(priorArtRiskLabel('medium')).toBe('中');
    expect(priorArtRiskLabel('high')).toBe('高');
    expect(priorArtRiskLabel(null)).toBe('未設定');
    expect(priorArtRiskLabel('huge')).toBe('huge');
  });
});

describe('deal ガード/ラベル', () => {
  it('isDealType は exclusive_license / complete_transfer 等の既知のみ true', () => {
    for (const t of DEAL_TYPES) {
      expect(isDealType(t)).toBe(true);
    }
    expect(isDealType('license')).toBe(false); // 旧称は無効
    expect(isDealType('')).toBe(false);
  });

  it('dealStatusLabel / dealTypeLabel は null/空で「未設定」、未知値は素通し', () => {
    expect(dealStatusLabel(null)).toBe('未設定');
    expect(dealStatusLabel('')).toBe('未設定');
    expect(dealStatusLabel('made_up_status')).toBe('made_up_status');
    expect(dealTypeLabel(null)).toBe('未設定');
    expect(dealTypeLabel('made_up_type')).toBe('made_up_type');
    for (const t of DEAL_TYPES) {
      expect(dealTypeLabel(t)).not.toBe('未設定');
    }
  });
});
