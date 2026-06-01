// Invention status helpers (MVP)
// Source of truth: docs/invention-state-machine.md / docs/invention-status-workflow.md
//
// このモジュールは operator による内部審査フェーズの遷移のみを扱う。
// company_disclosure_ready 以降（企業開示・NDA・deal 系）は開示制御MVP
// （roadmap Phase 11+）で扱うため、ここでは operator 選択肢に含めない。

export type InventionStatus =
  | 'draft'
  | 'submitted'
  | 'screening'
  | 'needs_more_info'
  | 'prior_art_research'
  | 'ip_strategy_review'
  | 'prototype_review'
  | 'attorney_review_ready'
  | 'company_disclosure_ready'
  | 'company_reviewing'
  | 'negotiating'
  | 'licensed'
  | 'assigned'
  | 'joint_development'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export const INVENTION_STATUS_LABELS: Record<InventionStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  screening: '一次診断中',
  needs_more_info: '追加情報待ち',
  prior_art_research: '先行技術調査中',
  ip_strategy_review: '知財方針検討中',
  prototype_review: '試作検討中',
  attorney_review_ready: '弁理士相談準備完了',
  company_disclosure_ready: '企業開示準備完了',
  company_reviewing: '企業検討中',
  negotiating: '交渉中',
  licensed: 'ライセンス成立',
  assigned: '譲渡成立',
  joint_development: '共同開発成立',
  rejected: '見送り',
  withdrawn: '取り下げ',
  archived: 'アーカイブ'
};

// operator が一覧・詳細で扱う内部審査フェーズ。
// company 開示以降は本MVPの対象外。
export const OPERATOR_REVIEW_STATUSES: InventionStatus[] = [
  'submitted',
  'screening',
  'needs_more_info',
  'prior_art_research',
  'ip_strategy_review',
  'prototype_review',
  'attorney_review_ready'
];

// operator が実行できる遷移（内部審査フェーズのみ）。
// state machine docのうち inventor/company 起点・開示/deal 系遷移は除外。
export const OPERATOR_STATUS_TRANSITIONS: Partial<Record<InventionStatus, InventionStatus[]>> = {
  submitted: ['screening', 'needs_more_info', 'rejected'],
  screening: ['prior_art_research', 'needs_more_info', 'rejected'],
  needs_more_info: ['screening', 'rejected'],
  prior_art_research: ['ip_strategy_review', 'needs_more_info', 'rejected'],
  ip_strategy_review: ['prototype_review', 'attorney_review_ready', 'needs_more_info', 'rejected'],
  prototype_review: ['attorney_review_ready', 'needs_more_info', 'rejected'],
  attorney_review_ready: ['needs_more_info', 'rejected']
};

export function inventionStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return '未設定';
  }
  return INVENTION_STATUS_LABELS[status as InventionStatus] ?? status;
}

export function getOperatorNextStatuses(current: string | null | undefined): InventionStatus[] {
  if (!current) {
    return [];
  }
  return OPERATOR_STATUS_TRANSITIONS[current as InventionStatus] ?? [];
}

export function isOperatorTransitionAllowed(from: string, to: string): boolean {
  return getOperatorNextStatuses(from).includes(to as InventionStatus);
}
