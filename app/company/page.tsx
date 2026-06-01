import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { companyReviewStatusLabel } from '@/lib/company/review';
import { disclosureLevelLabel, disclosureRequestStatusLabel } from '@/lib/company/disclosure';
import { acceptNdaAction } from './actions';

export const dynamic = 'force-dynamic';

const DEFAULT_NDA_VERSION = 'mvp-nda-v1';

type CompanyAccount = {
  id: string;
  company_name: string | null;
  review_status: string;
};

type CompanyMember = {
  company_account_id: string;
  role: string;
};

type NdaAcceptance = {
  company_account_id: string;
  nda_version: string;
  accepted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type DisclosureRequest = {
  company_account_id: string;
  requested_level: string;
  approved_level: string | null;
  status: string;
  created_at: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  company_id_missing: '企業IDが指定されていません。',
  forbidden: 'この操作には企業メンバー権限が必要です。',
  nda_version_required: 'NDAバージョンを入力してください。',
  nda_failed: 'NDA同意の記録に失敗しました。'
};

function ndaIsActive(nda: NdaAcceptance, nowIso: string): boolean {
  return !nda.revoked_at && (!nda.expires_at || nda.expires_at > nowIso);
}

export default async function CompanyPage({
  searchParams
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Company Portal（ログイン待ち）</h2>
        <p className="text-slate-700">自社のアカウント・NDA・開示申請状況の確認にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();

  // RLS により、自社（所属企業）のレコードのみ返る。
  const { data: companyRows } = await supabase
    .from('company_accounts')
    .select('id, company_name, review_status')
    .is('deleted_at', null)
    .order('company_name', { ascending: true });
  const companies = (companyRows ?? []) as CompanyAccount[];

  const { data: memberRows } = await supabase
    .from('company_members')
    .select('company_account_id, role')
    .is('deleted_at', null);
  const members = (memberRows ?? []) as CompanyMember[];

  const { data: ndaRows } = await supabase
    .from('nda_acceptances')
    .select('company_account_id, nda_version, accepted_at, expires_at, revoked_at')
    .is('deleted_at', null)
    .order('accepted_at', { ascending: false });
  const ndas = (ndaRows ?? []) as NdaAcceptance[];

  const { data: requestRows } = await supabase
    .from('company_disclosure_requests')
    .select('company_account_id, requested_level, approved_level, status, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const requests = (requestRows ?? []) as DisclosureRequest[];

  const nowIso = new Date().toISOString();
  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  const showSuccess = searchParams?.success === 'nda_accepted';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Company Portal</h2>
      <p className="text-slate-700">
        NDA前提のため、発明の詳細はこの画面に表示しません。自社のアカウント、NDA、開示申請の状況のみを確認できます。
      </p>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {showSuccess ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">NDA同意を記録しました。</p>
      ) : null}

      {companies.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">所属する企業アカウントがありません。</p>
      ) : (
        <ul className="space-y-4">
          {companies.map((company) => {
            const companyMembers = members.filter((m) => m.company_account_id === company.id);
            const companyNdas = ndas.filter((n) => n.company_account_id === company.id);
            const companyRequests = requests.filter((r) => r.company_account_id === company.id);
            const hasActiveNda = companyNdas.some((n) => ndaIsActive(n, nowIso));

            return (
              <li key={company.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <div className="space-y-1 text-sm text-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900">{company.company_name ?? '企業名未設定'}</h3>
                  <p>審査状態: {companyReviewStatusLabel(company.review_status)}</p>
                  <p>所属ロール: {companyMembers.map((m) => m.role).join(', ') || 'なし'}</p>
                  <p>有効NDA: {hasActiveNda ? 'あり' : 'なし'}</p>
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  <p className="font-medium">NDA履歴</p>
                  {companyNdas.length === 0 ? (
                    <p className="text-slate-600">NDA同意の記録はありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {companyNdas.map((nda, index) => (
                        <li key={`${company.id}-${index}`} className="text-xs text-slate-600">
                          {nda.nda_version} / 同意: {nda.accepted_at ? new Date(nda.accepted_at).toLocaleString('ja-JP') : '不明'} /{' '}
                          {nda.revoked_at ? '取消済み' : ndaIsActive(nda, nowIso) ? '有効' : '期限切れ'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  <p className="font-medium">開示申請</p>
                  {companyRequests.length === 0 ? (
                    <p className="text-slate-600">開示申請はありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {companyRequests.map((request, index) => (
                        <li key={`${company.id}-req-${index}`} className="text-xs text-slate-600">
                          申請: {disclosureLevelLabel(request.requested_level)} / 承認:{' '}
                          {request.approved_level ? disclosureLevelLabel(request.approved_level) : '未承認'} /{' '}
                          {disclosureRequestStatusLabel(request.status)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form action={acceptNdaAction} className="space-y-3 border-t border-slate-200 pt-3">
                  <input type="hidden" name="company_account_id" value={company.id} />
                  <div className="space-y-1">
                    <label htmlFor={`nda_version_${company.id}`} className="block text-sm font-medium text-slate-700">
                      NDAに同意する（バージョン）
                    </label>
                    <input
                      id={`nda_version_${company.id}`}
                      name="nda_version"
                      type="text"
                      required
                      defaultValue={DEFAULT_NDA_VERSION}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    NDAに同意する
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        発明の詳細開示は、NDA・開示承認・閲覧ログを満たした安全な経路（API）で別途提供されます。本画面では発明本文・図面・ファイルは表示しません。
      </p>
    </div>
  );
}
