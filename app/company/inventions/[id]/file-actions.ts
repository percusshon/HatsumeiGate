'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/log';
import { disclosureLevelRank, disclosureRequiresNda } from '@/lib/company/disclosure';
import {
  COMPANY_FILE_DOWNLOAD_LIMIT_PER_DAY,
  INVENTION_FILE_VIEW_TTL_SECONDS,
  isFileDisclosableToCompany
} from '@/lib/storage/invention-files';
import { getClientIp } from '@/lib/http/client-ip';

// 企業がNDA成立・開示承認済みのファイルを短期 signed URL で閲覧する。
// ページ表示と同等のゲートをサーバー側で再検証してから、閲覧ログ記録 → URL発行する。
export async function viewCompanyDisclosureFileAction(formData: FormData) {
  const inventionId = typeof formData.get('invention_id') === 'string' ? (formData.get('invention_id') as string).trim() : null;
  const fileId = typeof formData.get('file_id') === 'string' ? (formData.get('file_id') as string).trim() : null;
  const detailPath = inventionId ? `/company/inventions/${inventionId}` : '/company';

  if (!inventionId || !fileId) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const admin = createAdminSupabaseClient();

  // 1) 所属企業
  const { data: memberships } = await admin
    .from('company_members')
    .select('company_account_id')
    .eq('user_id', currentUser.id)
    .is('deleted_at', null);
  const companyIds = (memberships ?? []).map((m) => m.company_account_id);
  if (companyIds.length === 0) {
    redirect(`${detailPath}?error=file_forbidden`);
  }

  // 2) 当該発明の承認済み開示申請（発明者同意あり・承認レベルあり）
  const { data: approvals } = await admin
    .from('company_disclosure_requests')
    .select('id, company_account_id, approved_level')
    .eq('invention_id', inventionId)
    .in('company_account_id', companyIds)
    .eq('status', 'approved')
    .eq('inventor_approved', true)
    .not('approved_level', 'is', null)
    .is('deleted_at', null);

  if (!approvals || approvals.length === 0) {
    redirect(`${detailPath}?error=file_forbidden`);
  }

  const best = approvals.reduce((acc, cur) =>
    disclosureLevelRank(cur.approved_level) > disclosureLevelRank(acc.approved_level) ? cur : acc
  );
  const approvedLevel = best.approved_level as string;
  const companyAccountId = best.company_account_id as string;

  // 3) NDA（level_2 以上は必須）
  if (disclosureRequiresNda(approvedLevel)) {
    const nowIso = new Date().toISOString();
    const { data: ndaRows } = await admin
      .from('nda_acceptances')
      .select('expires_at')
      .eq('company_account_id', companyAccountId)
      .is('revoked_at', null)
      .is('deleted_at', null)
      .not('accepted_at', 'is', null);
    const hasActiveNda = (ndaRows ?? []).some((row) => !row.expires_at || row.expires_at > nowIso);
    if (!hasActiveNda) {
      redirect(`${detailPath}?error=file_nda_required`);
    }
  }

  // 4) ファイルが当該発明に属し、承認レベルで配信可能か
  const { data: fileRow } = await admin
    .from('invention_files')
    .select('id, invention_id, storage_bucket, storage_path, file_visibility, disclosure_level_required')
    .eq('id', fileId)
    .eq('invention_id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow || !isFileDisclosableToCompany(fileRow.file_visibility, fileRow.disclosure_level_required, approvedLevel)) {
    redirect(`${detailPath}?error=file_forbidden`);
  }

  // 5) DL回数上限（直近24時間・ユーザー単位、doc §7）。漏洩リスク低減のためのレート制限。
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentDownloads } = await admin
    .from('company_invention_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewed_by', currentUser.id)
    .eq('view_context', 'company_disclosure_file')
    .gte('created_at', sinceIso);
  if ((recentDownloads ?? 0) >= COMPANY_FILE_DOWNLOAD_LIMIT_PER_DAY) {
    redirect(`${detailPath}?error=file_download_limit`);
  }

  const headerList = headers();
  const clientIp = getClientIp(headerList);

  // 6) 配信前に閲覧ログを記録（漏洩対策の必須要件）。
  await admin.from('company_invention_views').insert({
    invention_id: inventionId,
    company_account_id: companyAccountId,
    viewed_by: currentUser.id,
    disclosure_request_id: best.id,
    viewed_level: approvedLevel,
    view_context: 'company_disclosure_file',
    user_agent: headerList.get('user-agent'),
    ip_address: clientIp
  });

  await recordAuditLog({
    eventType: 'file_downloaded',
    targetTable: 'invention_files',
    targetId: fileRow.id,
    actorUserId: currentUser.id,
    inventionId,
    companyAccountId,
    disclosureRequestId: best.id,
    userAgent: headerList.get('user-agent'),
    ipAddress: clientIp,
    metadata: { viewed_level: approvedLevel, disclosure_level_required: fileRow.disclosure_level_required }
  });

  const { data: signed, error: signError } = await admin.storage
    .from(fileRow.storage_bucket)
    .createSignedUrl(fileRow.storage_path, INVENTION_FILE_VIEW_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    redirect(`${detailPath}?error=file_url_failed`);
  }

  redirect(signed.signedUrl);
}
