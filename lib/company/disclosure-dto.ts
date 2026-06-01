// Disclosure DTO builder (MVP)
// Source of truth: docs/company-disclosure-workflow.md (開示レベル定義)
//
// 開示レベルごとに「企業へ見せてよい列」だけを段階的に許可する allow-list。
// 列単位の開示制御は RLS では表現できないため、service_role 経由のAPIでこのDTOを通す。

import { disclosureLevelRank } from './disclosure';

export type InventionRecord = {
  title: string | null;
  problem_summary: string | null;
  solution_summary: string | null;
  target_users: string | null;
  use_case: string | null;
  similar_products: string | null;
  prototype_status: string | null;
  desired_outcome: string | null;
};

export type DisclosureField = {
  label: string;
  value: string | null;
};

// 各フィールドが「どのレベル以上で開示可能か」を定義する。
const FIELD_MIN_RANK: Array<{ key: keyof InventionRecord; label: string; minRank: number }> = [
  { key: 'title', label: 'タイトル', minRank: 1 },
  { key: 'problem_summary', label: '課題要約', minRank: 1 },
  { key: 'use_case', label: '想定シーン', minRank: 1 },
  { key: 'desired_outcome', label: '期待効果', minRank: 1 },
  // level_2 (NDA要約) 以上
  { key: 'target_users', label: '対象ユーザー', minRank: 2 },
  { key: 'solution_summary', label: '解決方針（要約）', minRank: 2 },
  // level_3 (NDA詳細) 以上
  { key: 'similar_products', label: '既知の類似', minRank: 3 },
  { key: 'prototype_status', label: '試作状況', minRank: 3 }
];

export function buildInventionDisclosureDto(
  invention: InventionRecord,
  level: string | null | undefined
): DisclosureField[] {
  const rank = disclosureLevelRank(level);
  return FIELD_MIN_RANK.filter((field) => rank >= field.minRank).map((field) => ({
    label: field.label,
    value: invention[field.key]
  }));
}
