// Invention status helpers (MVP)
// Source of truth: docs/invention-state-machine.md / docs/invention-status-workflow.md
//
// このモジュールは operator が担うステータス遷移を扱う。
// 内部審査フェーズに加え、企業開示〜deal フェーズ（company_disclosure_ready 以降）の
// operator 起点遷移も docs/invention-state-machine.md に従って含める。
// company/inventor 単独起点の遷移（withdrawn, company_reviewing->negotiating の会社主導 等）は
// 別のアクター用フロー（RPC/RLS）で扱い、ここには含めない。

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

// operator が一覧・詳細で扱う（参照・遷移操作の対象となる）ステータス。
// 内部審査フェーズに加え、企業開示〜deal フェーズと終了系も含む（draft のみ対象外）。
export const OPERATOR_REVIEW_STATUSES: InventionStatus[] = [
  'submitted',
  'screening',
  'needs_more_info',
  'prior_art_research',
  'ip_strategy_review',
  'prototype_review',
  'attorney_review_ready',
  'company_disclosure_ready',
  'company_reviewing',
  'negotiating',
  'licensed',
  'assigned',
  'joint_development',
  'rejected',
  'withdrawn'
];

// operator が実行できる遷移（docs/invention-state-machine.md の operator 起点遷移）。
// inventor 単独（withdrawn）・会社単独起点の遷移は別フローで扱うため含めない。
export const OPERATOR_STATUS_TRANSITIONS: Partial<Record<InventionStatus, InventionStatus[]>> = {
  submitted: ['screening', 'needs_more_info', 'rejected'],
  screening: ['prior_art_research', 'needs_more_info', 'rejected'],
  needs_more_info: ['screening', 'rejected'],
  prior_art_research: ['ip_strategy_review', 'needs_more_info', 'rejected'],
  ip_strategy_review: [
    'prototype_review',
    'attorney_review_ready',
    'company_disclosure_ready',
    'needs_more_info',
    'rejected'
  ],
  prototype_review: ['attorney_review_ready', 'needs_more_info', 'rejected'],
  attorney_review_ready: ['company_disclosure_ready', 'needs_more_info', 'rejected'],
  company_disclosure_ready: ['company_reviewing', 'needs_more_info', 'rejected'],
  company_reviewing: ['negotiating', 'needs_more_info', 'rejected'],
  negotiating: ['licensed', 'assigned', 'joint_development', 'rejected'],
  licensed: ['archived'],
  assigned: ['archived'],
  joint_development: ['archived'],
  rejected: ['archived'],
  withdrawn: ['archived']
};

// 企業ティザー公開を許可するステータス（内部審査完了〜企業開示準備）。
export const TEASER_PUBLISHABLE_STATUSES: InventionStatus[] = [
  'attorney_review_ready',
  'company_disclosure_ready'
];

export function isTeaserPublishableStatus(status: string | null | undefined): boolean {
  return TEASER_PUBLISHABLE_STATUSES.includes(status as InventionStatus);
}

export function inventionStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return '未設定';
  }
  return INVENTION_STATUS_LABELS[status as InventionStatus] ?? status;
}

// 発明者向け表示ラベル（state machine doc §7）。
// ip_strategy_review / prototype_review / attorney_review_ready /
// company_disclosure_ready などの内部フェーズは「審査中」にマスクして
// 内部運用情報を発明者へ漏らさない。
export const INVENTOR_FACING_STATUS_LABELS: Record<InventionStatus, string> = {
  draft: '下書き',
  submitted: '受理（審査中）',
  screening: '審査中',
  needs_more_info: '追加情報のお願い',
  prior_art_research: '類似性の確認中',
  ip_strategy_review: '審査中',
  prototype_review: '審査中',
  attorney_review_ready: '審査中',
  company_disclosure_ready: '審査中',
  company_reviewing: '企業検討中',
  negotiating: '交渉中',
  licensed: 'ライセンス成立',
  assigned: '譲渡成立',
  joint_development: '共同開発成立',
  rejected: '見送り',
  withdrawn: '取り下げ',
  archived: '終了'
};

export function inventorFacingStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return '未設定';
  }
  return INVENTOR_FACING_STATUS_LABELS[status as InventionStatus] ?? '審査中';
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
