// Revenue event helpers (MVP)
// Source of truth: migration 0009 (revenue_events.event_type CHECK)
//
// 金額・手数料率は入力値として扱い、業務上の固定ポリシーはここでは定義しない。

export type RevenueEventType =
  | 'diagnostic_fee'
  | 'report_fee'
  | 'prototype_fee'
  | 'success_fee'
  | 'license_royalty'
  | 'assignment_fee'
  | 'joint_development_fee'
  | 'refund'
  | 'adjustment';

export const REVENUE_EVENT_TYPES: RevenueEventType[] = [
  'diagnostic_fee',
  'report_fee',
  'prototype_fee',
  'success_fee',
  'license_royalty',
  'assignment_fee',
  'joint_development_fee',
  'refund',
  'adjustment'
];

export const REVENUE_EVENT_TYPE_LABELS: Record<RevenueEventType, string> = {
  diagnostic_fee: '診断料',
  report_fee: 'レポート料',
  prototype_fee: '試作料',
  success_fee: '成功報酬',
  license_royalty: 'ライセンスロイヤリティ',
  assignment_fee: '譲渡料',
  joint_development_fee: '共同開発料',
  refund: '返金',
  adjustment: '調整'
};

export function isRevenueEventType(value: string): value is RevenueEventType {
  return (REVENUE_EVENT_TYPES as string[]).includes(value);
}

export function revenueEventTypeLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return REVENUE_EVENT_TYPE_LABELS[value as RevenueEventType] ?? value;
}

export function formatAmount(amount: number | string | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(num)) {
    return '—';
  }
  return `${num.toLocaleString('ja-JP')} ${currency ?? 'JPY'}`;
}
