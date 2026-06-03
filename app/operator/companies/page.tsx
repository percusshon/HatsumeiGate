import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  COMPANY_REVIEW_ACTIONS,
  COMPANY_REVIEW_STATUS_LABELS,
  companyReviewStatusLabel
} from '@/lib/company/review';
import { addCompanyMemberAction, reviewCompanyAccountAction } from './actions';

const COMPANY_MEMBER_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'company_user', label: '企業ユーザー' },
  { value: 'company_admin', label: '企業管理者' },
  { value: 'company_legal_reviewer', label: '企業法務レビュアー' }
];

export const dynamic = 'force-dynamic';

type CompanyAccount = {
  id: string;
  company_name: string | null;
  legal_name: string | null;
  website_url: string | null;
  industry: string | null;
  country: string | null;
  review_status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type CompanyMember = {
  id: string;
  company_account_id: string;
  user_id: string;
  role: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  company_id_missing: '企業IDが指定されていません。',
  forbidden: 'この操作にはoperator/admin権限が必要です。',
  invalid_status: '審査結果の指定が不正です。',
  update_failed: '審査結果の更新に失敗しました。',
  member_user_invalid: 'メンバーのユーザーID（UUID）が不正です。',
  member_role_invalid: 'メンバーのロール指定が不正です。',
  member_exists: 'そのユーザーは既に同じロールで登録されています。',
  member_add_failed: '企業メンバーの追加に失敗しました。'
};

const SUCCESS_MESSAGES: Record<string, string> = {
  reviewed: '審査結果を更新しました。',
  member_added: '企業メンバーを追加しました。'
};

export default async function OperatorCompaniesPage({
  searchParams
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">企業審査（ログイン待ち）</h2>
        <p className="text-slate-700">企業アカウントの審査にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: companyRows, error } = await supabase
    .from('company_accounts')
    .select('id, company_name, legal_name, website_url, industry, country, review_status, review_note, reviewed_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">取得エラー</h2>
        <p className="text-slate-700">企業アカウントの取得に失敗しました。権限（operator/reviewer/admin）をご確認ください。</p>
      </div>
    );
  }

  const companies = (companyRows ?? []) as CompanyAccount[];

  // operator は company_members を参照できる（migration 0014 company_members_select_internal）。
  const { data: memberRows } = await supabase
    .from('company_members')
    .select('id, company_account_id, user_id, role')
    .is('deleted_at', null);
  const members = (memberRows ?? []) as CompanyMember[];

  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  const successMessage = searchParams?.success ? SUCCESS_MESSAGES[searchParams.success] : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">企業アカウント審査（Operator）</h2>
      <Link href="/operator" className="inline-block text-sm text-blue-700 hover:underline">
        Operatorダッシュボードへ戻る
      </Link>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      <p className="text-slate-700">招待制・審査制の企業アカウントを承認 / 却下 / 停止します。</p>

      {companies.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">対象の企業アカウントはありません。</p>
      ) : (
        <ul className="space-y-4">
          {companies.map((company) => (
            <li key={company.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
              <div className="space-y-1 text-sm text-slate-700">
                <h3 className="text-lg font-semibold text-slate-900">{company.company_name ?? '企業名未設定'}</h3>
                <p>法人名: {company.legal_name || '未入力'}</p>
                <p>業界: {company.industry || '未入力'} / 国: {company.country || '未入力'}</p>
                {company.website_url ? <p className="break-all text-xs text-blue-700">{company.website_url}</p> : null}
                <p>現在の審査状態: {companyReviewStatusLabel(company.review_status)}</p>
                <p>審査メモ: {company.review_note || '未記録'}</p>
                <p className="text-xs text-slate-500">審査日時: {company.reviewed_at ? new Date(company.reviewed_at).toLocaleString('ja-JP') : '未審査'}</p>
              </div>

              <form action={reviewCompanyAccountAction} className="space-y-3 border-t border-slate-200 pt-3">
                <input type="hidden" name="company_account_id" value={company.id} />
                <div className="space-y-1">
                  <label htmlFor={`review_status_${company.id}`} className="block text-sm font-medium text-slate-700">
                    審査結果
                  </label>
                  <select
                    id={`review_status_${company.id}`}
                    name="review_status"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      選択してください
                    </option>
                    {COMPANY_REVIEW_ACTIONS.map((status) => (
                      <option key={status} value={status}>
                        {COMPANY_REVIEW_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  name="review_note"
                  rows={2}
                  placeholder="審査メモ（任意）"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  審査結果を保存
                </button>
              </form>

              <div className="space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-700">
                <p className="font-medium">企業メンバー</p>
                {(() => {
                  const companyMembers = members.filter((m) => m.company_account_id === company.id);
                  return companyMembers.length === 0 ? (
                    <p className="text-xs text-slate-600">メンバーはまだいません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {companyMembers.map((member) => (
                        <li key={member.id} className="text-xs text-slate-600">
                          {member.user_id} / {member.role}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                <form action={addCompanyMemberAction} className="flex flex-wrap items-end gap-2 pt-1">
                  <input type="hidden" name="company_account_id" value={company.id} />
                  <label className="space-y-0.5 text-xs text-slate-600">
                    <span className="block">ユーザーID（UUID）</span>
                    <input
                      name="user_id"
                      type="text"
                      required
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className="w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="space-y-0.5 text-xs text-slate-600">
                    <span className="block">ロール</span>
                    <select name="member_role" required defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                      <option value="" disabled>
                        選択
                      </option>
                      {COMPANY_MEMBER_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800">
                    メンバー追加
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
