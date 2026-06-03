import { describe, expect, it } from 'vitest';
import {
  buildInventionDisclosureDto,
  buildInventionTeaserFields,
  TEASER_FIELD_KEYS,
  type InventionRecord
} from '@/lib/company/disclosure-dto';

// 全フィールドに識別可能な値を入れた fixture。
// どのレベルでどの列が出る/出ないかを値レベルで検証する。
const FULL: InventionRecord = {
  title: 'T-title',
  problem_summary: 'T-problem',
  solution_summary: 'T-solution',
  target_users: 'T-users',
  use_case: 'T-usecase',
  similar_products: 'T-similar',
  prototype_status: 'T-prototype',
  desired_outcome: 'T-outcome'
};

// level_1 で開示してよいラベル（4列）。
const LEVEL1_LABELS = ['タイトル', '課題要約', '想定シーン', '期待効果'];
// level_2 で追加されるラベル（NDA要約）。
const LEVEL2_ADDED = ['対象ユーザー', '解決方針（要約）'];
// level_3 で追加されるラベル（NDA詳細）。
const LEVEL3_ADDED = ['既知の類似', '試作状況'];

// NDA 前（level_1 以下）に絶対に出してはいけない機密フィールドの値。
const CONFIDENTIAL_VALUES = ['T-solution', 'T-users', 'T-similar', 'T-prototype'];

function labelsOf(fields: { label: string; value: string | null }[]): string[] {
  return fields.map((f) => f.label);
}
function valuesOf(fields: { label: string; value: string | null }[]): (string | null)[] {
  return fields.map((f) => f.value);
}

describe('buildInventionDisclosureDto', () => {
  it('level_0（社内専用）では何も開示しない', () => {
    expect(buildInventionDisclosureDto(FULL, 'level_0_internal_only')).toEqual([]);
  });

  it('null / undefined / 未知のレベルは rank 0 として何も開示しない（安全側）', () => {
    expect(buildInventionDisclosureDto(FULL, null)).toEqual([]);
    expect(buildInventionDisclosureDto(FULL, undefined)).toEqual([]);
    expect(buildInventionDisclosureDto(FULL, 'garbage')).toEqual([]);
  });

  it('level_1（ティザー）は level_1 の4列のみ', () => {
    const fields = buildInventionDisclosureDto(FULL, 'level_1_company_teaser');
    expect(labelsOf(fields)).toEqual(LEVEL1_LABELS);
  });

  it('level_1 では機密フィールドが一切含まれない（過剰開示防止）', () => {
    const values = valuesOf(buildInventionDisclosureDto(FULL, 'level_1_company_teaser'));
    for (const secret of CONFIDENTIAL_VALUES) {
      expect(values).not.toContain(secret);
    }
  });

  it('level_2（NDA要約）で対象ユーザー・解決方針が追加される', () => {
    const labels = labelsOf(buildInventionDisclosureDto(FULL, 'level_2_nda_summary'));
    expect(labels).toEqual([...LEVEL1_LABELS, ...LEVEL2_ADDED]);
    // level_3 専用の列はまだ出ない。
    for (const l of LEVEL3_ADDED) {
      expect(labels).not.toContain(l);
    }
  });

  it('level_3（NDA詳細）で類似・試作状況まで開示される', () => {
    const labels = labelsOf(buildInventionDisclosureDto(FULL, 'level_3_nda_detail'));
    expect(labels).toEqual([...LEVEL1_LABELS, ...LEVEL2_ADDED, ...LEVEL3_ADDED]);
  });

  it('level_4（交渉パッケージ）は level_3 と同じフィールド集合（追加の発明列は無い）', () => {
    const l3 = labelsOf(buildInventionDisclosureDto(FULL, 'level_3_nda_detail'));
    const l4 = labelsOf(buildInventionDisclosureDto(FULL, 'level_4_negotiation_package'));
    expect(l4).toEqual(l3);
  });

  it('開示レベルが上がるほど列数は単調増加（減らない）', () => {
    const counts = [
      'level_0_internal_only',
      'level_1_company_teaser',
      'level_2_nda_summary',
      'level_3_nda_detail',
      'level_4_negotiation_package'
    ].map((lvl) => buildInventionDisclosureDto(FULL, lvl).length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    expect(counts).toEqual([0, 4, 6, 8, 8]);
  });

  it('値はそのまま透過し、null も保持する', () => {
    const partial: InventionRecord = { ...FULL, title: null };
    const fields = buildInventionDisclosureDto(partial, 'level_1_company_teaser');
    const title = fields.find((f) => f.label === 'タイトル');
    expect(title?.value).toBeNull();
  });
});

describe('TEASER_FIELD_KEYS', () => {
  it('level_1 の4キーのみで構成され、機密キーを含まない', () => {
    expect(TEASER_FIELD_KEYS.sort()).toEqual(
      ['title', 'problem_summary', 'use_case', 'desired_outcome'].sort()
    );
    for (const secret of ['solution_summary', 'target_users', 'similar_products', 'prototype_status']) {
      expect(TEASER_FIELD_KEYS).not.toContain(secret);
    }
  });
});

describe('buildInventionTeaserFields', () => {
  it('常に level_1 の4列のみを返す（過剰開示防止）', () => {
    const fields = buildInventionTeaserFields(FULL);
    expect(labelsOf(fields)).toEqual(LEVEL1_LABELS);
    for (const secret of CONFIDENTIAL_VALUES) {
      expect(valuesOf(fields)).not.toContain(secret);
    }
  });
});
