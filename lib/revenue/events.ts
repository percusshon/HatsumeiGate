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

// プラットフォーム手数料率（成功報酬/ロイヤリティ等）。
// 金額のみ入力された場合に手数料・発明者取り分を自動算出する既定値。operator は上書き可。
export const DEFAULT_PLATFORM_FEE_RATE = 0.2;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// amount から手数料率で按分する。手数料=amount×rate、発明者取り分=amount−手数料。
export function computeFeeSplit(
  amount: number,
  rate: number = DEFAULT_PLATFORM_FEE_RATE
): { platformFeeAmount: number; inventorAmount: number; rate: number } {
  const platformFeeAmount = round2(amount * rate);
  return { platformFeeAmount, inventorAmount: round2(amount - platformFeeAmount), rate };
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
