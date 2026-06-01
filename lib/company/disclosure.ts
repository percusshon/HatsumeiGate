// Company disclosure helpers (MVP)
// Source of truth: docs/company-disclosure-workflow.md / migration 0001 (disclosure_level)
//                  / migration 0007 (company_disclosure_requests)
//
// 重要: 本モジュールは「開示申請の承認ゲート判定」を担う。
// level_2 以上は NDA 必須、承認には発明者同意必須、承認レベルは申請レベル以下。

export type DisclosureLevel =
  | 'level_0_internal_only'
  | 'level_1_company_teaser'
  | 'level_2_nda_summary'
  | 'level_3_nda_detail'
  | 'level_4_negotiation_package';

export const DISCLOSURE_LEVELS: DisclosureLevel[] = [
  'level_0_internal_only',
  'level_1_company_teaser',
  'level_2_nda_summary',
  'level_3_nda_detail',
  'level_4_negotiation_package'
];

// operator が開示申請に対して承認できるレベル（level_0 は社内専用のため対象外）。
export const DISCLOSURE_APPROVABLE_LEVELS: DisclosureLevel[] = [
  'level_1_company_teaser',
  'level_2_nda_summary',
  'level_3_nda_detail',
  'level_4_negotiation_package'
];

export const DISCLOSURE_LEVEL_LABELS: Record<DisclosureLevel, string> = {
  level_0_internal_only: 'level 0：社内専用',
  level_1_company_teaser: 'level 1：企業ティザー',
  level_2_nda_summary: 'level 2：NDA要約',
  level_3_nda_detail: 'level 3：NDA詳細',
  level_4_negotiation_package: 'level 4：交渉パッケージ'
};

export function disclosureLevelRank(level: string | null | undefined): number {
  switch (level) {
    case 'level_0_internal_only':
      return 0;
    case 'level_1_company_teaser':
      return 1;
    case 'level_2_nda_summary':
      return 2;
    case 'level_3_nda_detail':
      return 3;
    case 'level_4_negotiation_package':
      return 4;
    default:
      return 0;
  }
}

export function isDisclosureLevel(value: string): value is DisclosureLevel {
  return (DISCLOSURE_LEVELS as string[]).includes(value);
}

// level_2 (NDA要約) 以上は NDA 必須。
export function disclosureRequiresNda(level: string | null | undefined): boolean {
  return disclosureLevelRank(level) >= 2;
}

export function disclosureLevelLabel(level: string | null | undefined): string {
  if (!level) {
    return '未設定';
  }
  return DISCLOSURE_LEVEL_LABELS[level as DisclosureLevel] ?? level;
}

// company_disclosure_requests.status
export type DisclosureRequestStatus = 'requested' | 'approved' | 'rejected' | 'revoked' | 'expired';

// operator が設定できる審査結果。
export const DISCLOSURE_REVIEW_DECISIONS: DisclosureRequestStatus[] = [
  'approved',
  'rejected',
  'revoked'
];

export const DISCLOSURE_REQUEST_STATUS_LABELS: Record<DisclosureRequestStatus, string> = {
  requested: '申請中',
  approved: '承認済み',
  rejected: '却下',
  revoked: '取消',
  expired: '期限切れ'
};

export function isDisclosureReviewDecision(value: string): value is DisclosureRequestStatus {
  return (DISCLOSURE_REVIEW_DECISIONS as string[]).includes(value);
}

export function disclosureRequestStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return DISCLOSURE_REQUEST_STATUS_LABELS[value as DisclosureRequestStatus] ?? value;
}
