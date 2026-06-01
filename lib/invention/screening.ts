// Screening helpers (MVP)
// Source of truth: docs/invention-screening-logic.md
// 各評価軸は 0〜5 点（高いほど良い）。総合判定は A〜E。

export type ScreeningAxis =
  | 'novelty_hypothesis'
  | 'inventive_step_hypothesis'
  | 'market_need'
  | 'implementation_feasibility'
  | 'company_fit'
  | 'ip_risk'
  | 'disclosure_risk'
  | 'legal_safety_risk';

export const SCREENING_AXES: ScreeningAxis[] = [
  'novelty_hypothesis',
  'inventive_step_hypothesis',
  'market_need',
  'implementation_feasibility',
  'company_fit',
  'ip_risk',
  'disclosure_risk',
  'legal_safety_risk'
];

export const SCREENING_AXIS_LABELS: Record<ScreeningAxis, string> = {
  novelty_hypothesis: '新規性仮説',
  inventive_step_hypothesis: '進歩性仮説',
  market_need: '市場ニーズ',
  implementation_feasibility: '実装可能性',
  company_fit: '企業適合性',
  ip_risk: '知財リスク',
  disclosure_risk: '開示リスク',
  legal_safety_risk: '法務・安全リスク'
};

export type ScreeningRating = 'A' | 'B' | 'C' | 'D' | 'E';

export const SCREENING_RATINGS: ScreeningRating[] = ['A', 'B', 'C', 'D', 'E'];

export const SCREENING_RATING_LABELS: Record<ScreeningRating, string> = {
  A: 'A：企業提案候補',
  B: 'B：追加調査後に検討',
  C: 'C：試作/再設計が必要',
  D: 'D：特許より別手段がよい',
  E: 'E：不採用'
};

export const SCREENING_SCORE_MIN = 0;
export const SCREENING_SCORE_MAX = 5;

export function isScreeningRating(value: string): value is ScreeningRating {
  return (SCREENING_RATINGS as string[]).includes(value);
}

export function screeningAxisLabel(axis: string | null | undefined): string {
  if (!axis) {
    return '未設定';
  }
  return SCREENING_AXIS_LABELS[axis as ScreeningAxis] ?? axis;
}

export function screeningRatingLabel(rating: string | null | undefined): string {
  if (!rating) {
    return '未判定';
  }
  return SCREENING_RATING_LABELS[rating as ScreeningRating] ?? rating;
}
