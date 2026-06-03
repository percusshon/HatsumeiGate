import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/log';
import { disclosureLevelRank, disclosureRequiresNda } from '@/lib/company/disclosure';
import {
  COMPANY_FILE_DOWNLOAD_LIMIT_PER_DAY,
  INVENTION_FILE_VIEW_TTL_SECONDS,
  isFileDisclosableToCompany
} from '@/lib/storage/invention-files';
import {
  buildWatermarkText,
  isPdfMime,
  isWatermarkableImageMime,
  watermarkImage,
  watermarkPdf
} from '@/lib/storage/watermark';
import { getClientIp } from '@/lib/http/client-ip';

// sharp / pdf-lib / fontkit を使うため Node ランタイム必須。透かしは配信の都度生成する。
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { id: string; fileId: string };

// 企業がNDA成立・開示承認済みのファイルを閲覧する。
// ページ表示と同等のゲートをサーバー側で再検証し、閲覧ログ記録 → 透かしを焼き込んで inline 配信する。
// 生のストレージ URL はクライアントに渡さない（透かしを必ず通すため）。
export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const inventionId = params.id;
  const fileId = params.fileId;
  const detailUrl = (error: string) =>
    new URL(`/company/inventions/${inventionId}?error=${error}`, request.url);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.redirect(new URL('/login', request.url));
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
    return NextResponse.redirect(detailUrl('file_forbidden'));
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
    return NextResponse.redirect(detailUrl('file_forbidden'));
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
      return NextResponse.redirect(detailUrl('file_nda_required'));
    }
  }

  // 4) ファイルが当該発明に属し、承認レベルで配信可能か
  const { data: fileRow } = await admin
    .from('invention_files')
    .select('id, invention_id, original_filename, mime_type, storage_bucket, storage_path, file_visibility, disclosure_level_required')
    .eq('id', fileId)
    .eq('invention_id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow || !isFileDisclosableToCompany(fileRow.file_visibility, fileRow.disclosure_level_required, approvedLevel)) {
    return NextResponse.redirect(detailUrl('file_forbidden'));
  }

  // 5) DL回数上限（直近24時間・ユーザー単位、doc §7）。
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentDownloads } = await admin
    .from('company_invention_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewed_by', currentUser.id)
    .eq('view_context', 'company_disclosure_file')
    .gte('created_at', sinceIso);
  if ((recentDownloads ?? 0) >= COMPANY_FILE_DOWNLOAD_LIMIT_PER_DAY) {
    return NextResponse.redirect(detailUrl('file_download_limit'));
  }

  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent');

  // 6) 配信前に閲覧ログを記録（漏洩対策の必須要件）。
  await admin.from('company_invention_views').insert({
    invention_id: inventionId,
    company_account_id: companyAccountId,
    viewed_by: currentUser.id,
    disclosure_request_id: best.id,
    viewed_level: approvedLevel,
    view_context: 'company_disclosure_file',
    user_agent: userAgent,
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
    userAgent,
    ipAddress: clientIp,
    metadata: { viewed_level: approvedLevel, disclosure_level_required: fileRow.disclosure_level_required }
  });

  // 7) ストレージから実体を取得
  const { data: blob, error: downloadError } = await admin.storage
    .from(fileRow.storage_bucket)
    .download(fileRow.storage_path);

  if (downloadError || !blob) {
    return NextResponse.redirect(detailUrl('file_url_failed'));
  }

  const inputBuffer = Buffer.from(await blob.arrayBuffer());

  // 8) 透かしを焼き込む（社名＋閲覧者ID＋日時）。画像/PDF以外はそのまま配信。
  const { data: companyRow } = await admin
    .from('company_accounts')
    .select('company_name')
    .eq('id', companyAccountId)
    .maybeSingle();

  const watermarkText = buildWatermarkText({
    companyName: companyRow?.company_name ?? null,
    companyAccountId,
    viewerId: currentUser.id
  });

  let outBuffer: Buffer = inputBuffer;
  let contentType = fileRow.mime_type || 'application/octet-stream';
  try {
    if (isWatermarkableImageMime(fileRow.mime_type)) {
      const wm = await watermarkImage(inputBuffer, watermarkText);
      outBuffer = wm.buffer;
      contentType = wm.contentType;
    } else if (isPdfMime(fileRow.mime_type)) {
      const wm = await watermarkPdf(inputBuffer, watermarkText);
      outBuffer = wm.buffer;
      contentType = wm.contentType;
    }
  } catch {
    // 透かし生成に失敗した場合は配信せず、安全側に倒して詳細ページへ戻す。
    return NextResponse.redirect(detailUrl('file_url_failed'));
  }

  const safeName = (fileRow.original_filename || 'file').replace(/[\r\n"]/g, '_');
  const encodedName = encodeURIComponent(fileRow.original_filename || 'file');

  return new NextResponse(new Uint8Array(outBuffer), {
    status: 200,
    headers: {
      'content-type': contentType,
      'content-disposition': `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      // 透かし済みでもブラウザ/プロキシにキャッシュさせない。短期 TTL に合わせる。
      'cache-control': `private, no-store, max-age=${INVENTION_FILE_VIEW_TTL_SECONDS}`,
      'x-content-type-options': 'nosniff'
    }
  });
}
