import Link from 'next/link';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { disclosureLevelLabel, disclosureLevelRank, disclosureRequiresNda } from '@/lib/company/disclosure';
import { buildInventionDisclosureDto, type InventionRecord } from '@/lib/company/disclosure-dto';
import { recordAuditLog } from '@/lib/audit/log';
import { isFileDisclosableToCompany } from '@/lib/storage/invention-files';
import { getClientIp } from '@/lib/http/client-ip';
import { dealStatusLabel, dealTypeLabel } from '@/lib/deal/status';
import { viewCompanyDisclosureFileAction } from './file-actions';

export const dynamic = 'force-dynamic';

type RouteParams = { id: string };

function DeniedView({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">開示できません</h2>
      <p className="text-slate-700">{message}</p>
      <Link href="/company" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
        Company Portalへ戻る
      </Link>
    </div>
  );
}

// ゲート付き企業開示ビュー。
// service_role を用いるが、以下をコードで厳格に検証してからのみ開示する:
// 1) 本人認証（anonセッションのユーザーID）
// 2) そのユーザーが所属する企業
// 3) 当該発明への approved + inventor_approved + approved_level の開示承認
// 4) level_2 以上は有効NDA
// そして開示前に閲覧ログ(company_invention_views)を必ず記録する。
export default async function CompanyInventionDisclosurePage({ params }: { params: RouteParams }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">ログインしてください</h2>
        <p className="text-slate-700">開示情報の閲覧にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const admin = createAdminSupabaseClient();

  // 1) 本人の所属企業（service_role だが user.id は検証済みJWT由来）。
  const { data: memberships } = await admin
    .from('company_members')
    .select('company_account_id')
    .eq('user_id', currentUser.id)
    .is('deleted_at', null);

  const companyIds = (memberships ?? []).map((m) => m.company_account_id);
  if (companyIds.length === 0) {
    return <DeniedView message="企業メンバーとして登録されていません。" />;
  }

  // 2) 当該発明への、所属企業の承認済み開示申請。
  const { data: approvals } = await admin
    .from('company_disclosure_requests')
    .select('id, company_account_id, approved_level')
    .eq('invention_id', params.id)
    .in('company_account_id', companyIds)
    .eq('status', 'approved')
    .eq('inventor_approved', true)
    .not('approved_level', 'is', null)
    .is('deleted_at', null);

  if (!approvals || approvals.length === 0) {
    return <DeniedView message="この発明に対する有効な開示承認がありません。" />;
  }

  // 最も高い承認レベルを採用。
  const best = approvals.reduce((acc, cur) =>
    disclosureLevelRank(cur.approved_level) > disclosureLevelRank(acc.approved_level) ? cur : acc
  );
  const approvedLevel = best.approved_level as string;
  const companyAccountId = best.company_account_id as string;

  // 3) level_2 以上は有効NDA必須。
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
      return <DeniedView message="このレベルの開示には有効なNDAが必要です。NDAを締結してください。" />;
    }
  }

  // 4) 発明レコード取得 → レベル別DTOに絞り込み。
  const { data: invention } = await admin
    .from('inventions')
    .select('title, problem_summary, solution_summary, target_users, use_case, similar_products, prototype_status, desired_outcome')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!invention) {
    return <DeniedView message="対象の発明が見つかりませんでした。" />;
  }

  // 5) 開示前に閲覧ログを記録（append-only / 漏洩対策の必須要件）。
  const headerList = headers();
  const clientIp = getClientIp(headerList);
  await admin.from('company_invention_views').insert({
    invention_id: params.id,
    company_account_id: companyAccountId,
    viewed_by: currentUser.id,
    disclosure_request_id: best.id,
    viewed_level: approvedLevel,
    view_context: 'company_disclosure_view',
    user_agent: headerList.get('user-agent'),
    ip_address: clientIp
  });

  // 監査ログにも閲覧イベントを記録（横断的な監査要件）。
  await recordAuditLog({
    eventType: 'company_invention_viewed',
    targetTable: 'inventions',
    targetId: params.id,
    actorUserId: currentUser.id,
    inventionId: params.id,
    companyAccountId,
    disclosureRequestId: best.id,
    userAgent: headerList.get('user-agent'),
    ipAddress: clientIp,
    metadata: { viewed_level: approvedLevel, view_context: 'company_disclosure_view' }
  });

  const fields = buildInventionDisclosureDto(invention as InventionRecord, approvedLevel);

  // 承認レベルで配信可能なファイルのみ抽出（列単位の開示制御のため admin で取得後にフィルタ）。
  const { data: fileRows } = await admin
    .from('invention_files')
    .select('id, original_filename, mime_type, file_visibility, disclosure_level_required')
    .eq('invention_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const disclosableFiles = (fileRows ?? []).filter((file) =>
    isFileDisclosableToCompany(file.file_visibility, file.disclosure_level_required, approvedLevel)
  );

  // level_4（交渉パッケージ）のとき、自社の deal 情報（種別/状態/提示条件）を開示する。
  let level4Deal: { deal_type: string; status: string; proposed_terms_summary: string | null } | null = null;
  if (disclosureLevelRank(approvedLevel) >= 4) {
    const { data: dealRow } = await admin
      .from('deal_pipeline')
      .select('deal_type, status, proposed_terms_summary')
      .eq('invention_id', params.id)
      .eq('company_account_id', companyAccountId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .maybeSingle();
    level4Deal = dealRow ?? null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">開示情報（{disclosureLevelLabel(approvedLevel)}）</h2>
      <Link href="/company" className="inline-block text-sm text-blue-700 hover:underline">
        Company Portalへ戻る
      </Link>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        この画面の情報は秘密情報です。スクリーンショット・社外共有・第三者転送は禁止です。閲覧は記録されています。
      </div>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        {fields.map((field) => (
          <div key={field.label} className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">{field.label}</p>
            <p className="text-sm text-slate-800">{field.value || '（記載なし）'}</p>
          </div>
        ))}
      </section>

      {level4Deal ? (
        <section className="space-y-2 rounded-md border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold">取引情報（交渉パッケージ）</h3>
          <p className="text-sm text-slate-700">取引種別: {dealTypeLabel(level4Deal.deal_type)}</p>
          <p className="text-sm text-slate-700">状態: {dealStatusLabel(level4Deal.status)}</p>
          <p className="text-sm text-slate-700">提示条件: {level4Deal.proposed_terms_summary || '未入力'}</p>
          <p className="text-xs text-slate-500">本情報は交渉用の秘密情報です。社外共有は禁止です。閲覧は記録されています。</p>
        </section>
      ) : null}

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold">開示ファイル</h3>
        {disclosableFiles.length === 0 ? (
          <p className="text-sm text-slate-600">この開示レベルで閲覧できるファイルはありません。</p>
        ) : (
          <ul className="space-y-2">
            {disclosableFiles.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700"
              >
                <div className="space-y-0.5">
                  <p className="font-medium break-all">{file.original_filename}</p>
                  <p className="text-xs text-slate-500">{file.mime_type || '種別不明'}</p>
                </div>
                <form action={viewCompanyDisclosureFileAction}>
                  <input type="hidden" name="invention_id" value={params.id} />
                  <input type="hidden" name="file_id" value={file.id} />
                  <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                    閲覧
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          ファイルの閲覧URLは短時間で失効し、閲覧は記録されます。社外共有・第三者転送は禁止です。
        </p>
      </section>

      <p className="text-xs text-slate-500">
        開示レベルに応じて表示項目は制限されています。より詳細な情報は、追加の開示承認とNDAが必要です。
      </p>
    </div>
  );
}
