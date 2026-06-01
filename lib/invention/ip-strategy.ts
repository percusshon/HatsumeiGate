// IP strategy / prior art helpers (MVP)
// Source of truth: docs/ip-strategy-decision-tree.md / migration 0001 (ip_strategy_type)

export type IpStrategyType =
  | 'patent'
  | 'utility_model'
  | 'design_right'
  | 'trademark'
  | 'copyright'
  | 'trade_secret'
  | 'open_source'
  | 'defensive_publication'
  | 'no_ip_action'
  | 'redesign_required';

export const IP_STRATEGY_TYPES: IpStrategyType[] = [
  'patent',
  'utility_model',
  'design_right',
  'trademark',
  'copyright',
  'trade_secret',
  'open_source',
  'defensive_publication',
  'no_ip_action',
  'redesign_required'
];

export const IP_STRATEGY_TYPE_LABELS: Record<IpStrategyType, string> = {
  patent: '特許',
  utility_model: '実用新案',
  design_right: '意匠',
  trademark: '商標',
  copyright: '著作権',
  trade_secret: '営業秘密',
  open_source: 'オープンソース',
  defensive_publication: '防衛公開',
  no_ip_action: '知財対応なし',
  redesign_required: '再設計が必要'
};

export function isIpStrategyType(value: string): value is IpStrategyType {
  return (IP_STRATEGY_TYPES as string[]).includes(value);
}

export function ipStrategyTypeLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return IP_STRATEGY_TYPE_LABELS[value as IpStrategyType] ?? value;
}

// 先行技術のリスク水準（prior_art_items.risk_level は text なので候補値を固定運用する）
export type PriorArtRiskLevel = 'low' | 'medium' | 'high';

export const PRIOR_ART_RISK_LEVELS: PriorArtRiskLevel[] = ['low', 'medium', 'high'];

export const PRIOR_ART_RISK_LABELS: Record<PriorArtRiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高'
};

export function isPriorArtRiskLevel(value: string): value is PriorArtRiskLevel {
  return (PRIOR_ART_RISK_LEVELS as string[]).includes(value);
}

export function priorArtRiskLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return PRIOR_ART_RISK_LABELS[value as PriorArtRiskLevel] ?? value;
}
