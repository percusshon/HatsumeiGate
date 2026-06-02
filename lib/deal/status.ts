// Deal pipeline helpers (MVP)
// Source of truth: docs/deal-pipeline-state-machine.md / migration 0001 (deal_status, deal_type)
//
// 本モジュールは operator が担う遷移のみを扱う（company / inventor 起点の遷移は対象外）。
// deal レコードの新規作成は migration 0019 で operator/admin に insert を許可した。

export type DealStatus =
  | 'no_interest'
  | 'interested'
  | 'nda_requested'
  | 'nda_accepted'
  | 'meeting_requested'
  | 'meeting_completed'
  | 'evaluating'
  | 'terms_proposed'
  | 'negotiating'
  | 'licensed'
  | 'assigned'
  | 'joint_development'
  | 'declined'
  | 'closed';

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  no_interest: '関心なし',
  interested: '関心あり',
  nda_requested: 'NDA申請中',
  nda_accepted: 'NDA締結済み',
  meeting_requested: '面談依頼',
  meeting_completed: '面談完了',
  evaluating: '評価中',
  terms_proposed: '条件提示',
  negotiating: '交渉中',
  licensed: 'ライセンス成立',
  assigned: '譲渡成立',
  joint_development: '共同開発成立',
  declined: '辞退',
  closed: 'クローズ'
};

export type DealType =
  | 'complete_transfer'
  | 'exclusive_license'
  | 'non_exclusive_license'
  | 'joint_development'
  | 'proof_of_concept'
  | 'option';

export const DEAL_TYPES: DealType[] = [
  'complete_transfer',
  'exclusive_license',
  'non_exclusive_license',
  'joint_development',
  'proof_of_concept',
  'option'
];

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  complete_transfer: '完全譲渡',
  exclusive_license: '独占ライセンス',
  non_exclusive_license: '非独占ライセンス',
  joint_development: '共同開発',
  proof_of_concept: '実証実験(PoC)',
  option: 'オプション'
};

// operator が実行できる遷移（state machine のうち operator 起点・運営承認の遷移）。
// 会社/発明者単独アクション（interested, nda_requested, meeting_* 等）は含めない。
export const OPERATOR_DEAL_TRANSITIONS: Partial<Record<DealStatus, DealStatus[]>> = {
  no_interest: ['closed'],
  nda_requested: ['interested'],
  nda_accepted: ['no_interest'],
  meeting_completed: ['evaluating'],
  evaluating: ['terms_proposed'],
  terms_proposed: ['evaluating'],
  negotiating: ['licensed', 'assigned', 'joint_development', 'declined', 'closed'],
  licensed: ['closed'],
  assigned: ['closed'],
  joint_development: ['closed'],
  declined: ['closed']
};

export function isDealType(value: string): value is DealType {
  return (DEAL_TYPES as string[]).includes(value);
}

export function dealStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return DEAL_STATUS_LABELS[value as DealStatus] ?? value;
}

export function dealTypeLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return DEAL_TYPE_LABELS[value as DealType] ?? value;
}

export function getOperatorDealNextStatuses(current: string | null | undefined): DealStatus[] {
  if (!current) {
    return [];
  }
  return OPERATOR_DEAL_TRANSITIONS[current as DealStatus] ?? [];
}

export function isOperatorDealTransitionAllowed(from: string, to: string): boolean {
  return getOperatorDealNextStatuses(from).includes(to as DealStatus);
}
