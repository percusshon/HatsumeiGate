// Company account review helpers (MVP)
// Source of truth: migration 0006 (company_accounts.review_status)

export type CompanyReviewStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export const COMPANY_REVIEW_STATUSES: CompanyReviewStatus[] = [
  'pending',
  'approved',
  'rejected',
  'suspended'
];

// operator が設定できる審査結果（pending は初期状態のため対象外）。
export const COMPANY_REVIEW_ACTIONS: CompanyReviewStatus[] = ['approved', 'rejected', 'suspended'];

export const COMPANY_REVIEW_STATUS_LABELS: Record<CompanyReviewStatus, string> = {
  pending: '審査待ち',
  approved: '承認済み',
  rejected: '却下',
  suspended: '停止中'
};

export function isCompanyReviewAction(value: string): value is CompanyReviewStatus {
  return (COMPANY_REVIEW_ACTIONS as string[]).includes(value);
}

export function companyReviewStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return '未設定';
  }
  return COMPANY_REVIEW_STATUS_LABELS[value as CompanyReviewStatus] ?? value;
}
