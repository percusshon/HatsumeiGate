import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  DISCLOSURE_APPROVABLE_LEVELS,
  DISCLOSURE_LEVEL_LABELS
} from '@/lib/company/disclosure';
import {
  TEASER_FIELD_KEYS,
  buildInventionTeaserFields,
  type InventionTeaserRecord
} from '@/lib/company/disclosure-dto';
import { createDisclosureRequestAction } from '../actions';

export const dynamic = 'force-dynamic';

type ApprovedCompany = {
  id: string;
  company_name: string | null;
};

type TeaserInvention = InventionTeaserRecord & {
  id: string;
};

// 企業向けティザー一覧（発明 discovery）。
// 設計上の制約:
// - operator が current_disclosure_level を level_1 以上に開いた発明のみを対象にする。
// - 列単位の開示制御は RLS で表現できないため、service_role 経由で level_1 の列だけを取得する。
//   （高位レベルの列はそもそも取得しない＝過剰開示の防止）
// - 閲覧できるのは review_status='approved' の企業に所属するメンバーのみ。
// - ティザーは NDA 前の最小開示のため、詳細開示ビュー（level_2+）のような個別閲覧ログは取らない。
//   発明本文・図面・ファイルはここでは一切出さない。
export default async function CompanyDiscoveryPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">発明ティザー一覧（ログイン待ち）</h2>
        <p className="text-slate-700">ティザーの閲覧にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const admin = createAdminSupabaseClient();

  // 1) 本人の所属企業のうち、審査承認済み（approved）のものだけを抽出。
  const { data: memberships } = await admin
    .from('company_members')
    .select('company_account_id')
    .eq('user_id', currentUser.id)
    .is('deleted_at', null);

  const memberCompanyIds = (memberships ?? []).map((m) => m.company_account_id);

  let approvedCompanies: ApprovedCompany[] = [];
  if (memberCompanyIds.length > 0) {
    const { data: companyRows } = await admin
      .from('company_accounts')
      .select('id, company_name')
      .in('id', memberCompanyIds)
      .eq('review_status', 'approved')
      .is('deleted_at', null)
      .order('company_name', { ascending: true });
    approvedCompanies = (companyRows ?? []) as ApprovedCompany[];
  }

  if (approvedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">発明ティザー一覧</h2>
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
          ティザーを閲覧できるのは審査承認済みの企業アカウントに所属するメンバーのみです。承認状況は{' '}
          <Link href="/company" className="text-blue-700 hover:underline">
            Company Portal
          </Link>{' '}
          で確認できます。
        </p>
      </div>
    );
  }

  // 2) operator が level_1 以上に開いた発明のみ、level_1 の列だけを取得。
  const { data: inventionRows } = await admin
    .from('inventions')
    .select(['id', ...TEASER_FIELD_KEYS].join(', '))
    .neq('current_disclosure_level', 'level_0_internal_only')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const teasers = (inventionRows ?? []) as unknown as TeaserInvention[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">発明ティザー一覧</h2>
        <Link href="/company" className="text-sm text-blue-700 hover:underline">
          Company Portalへ
        </Link>
      </div>
      <p className="text-slate-700">
        運営が企業向けに公開した発明の概要（ティザー）です。詳細・図面・ファイルは含まれません。関心がある発明には、開示申請を作成してください。
      </p>

      {teasers.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
          現在、公開中のティザーはありません。
        </p>
      ) : (
        <ul className="space-y-4">
          {teasers.map((invention) => {
            const fields = buildInventionTeaserFields(invention);
            const titleField = fields.find((f) => f.label === 'タイトル');
            const otherFields = fields.filter((f) => f.label !== 'タイトル');

            return (
              <li key={invention.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {titleField?.value || '（タイトル未設定）'}
                </h3>
                <dl className="space-y-2">
                  {otherFields.map((field) => (
                    <div key={field.label} className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">{field.label}</dt>
                      <dd className="text-sm text-slate-800">{field.value || '（記載なし）'}</dd>
                    </div>
                  ))}
                </dl>

                <form action={createDisclosureRequestAction} className="space-y-2 border-t border-slate-200 pt-3">
                  <input type="hidden" name="invention_id" value={invention.id} />
                  <p className="text-sm font-medium text-slate-700">この発明の開示を申請</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">申請する企業</span>
                      <select
                        name="company_account_id"
                        required
                        defaultValue={approvedCompanies.length === 1 ? approvedCompanies[0].id : ''}
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {approvedCompanies.length === 1 ? null : (
                          <option value="" disabled>
                            選択
                          </option>
                        )}
                        {approvedCompanies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.company_name ?? '企業名未設定'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">希望する開示レベル</span>
                      <select
                        name="requested_level"
                        required
                        defaultValue=""
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="" disabled>
                          選択
                        </option>
                        {DISCLOSURE_APPROVABLE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {DISCLOSURE_LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800"
                    >
                      開示申請を送信
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        ティザーは NDA 前の最小限の概要です。NDA要約・詳細・交渉パッケージの開示には、開示申請の承認・発明者同意・NDA締結が必要です。
      </p>
    </div>
  );
}
