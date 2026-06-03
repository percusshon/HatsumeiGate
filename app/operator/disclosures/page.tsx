import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  DISCLOSURE_APPROVABLE_LEVELS,
  DISCLOSURE_LEVEL_LABELS,
  DISCLOSURE_REVIEW_DECISIONS,
  disclosureLevelLabel,
  disclosureLevelRank,
  disclosureRequestStatusLabel
} from '@/lib/company/disclosure';
import { reviewDisclosureRequestAction } from './actions';

export const dynamic = 'force-dynamic';

type DisclosureRequest = {
  id: string;
  invention_id: string;
  company_account_id: string;
  requested_level: string;
  approved_level: string | null;
  status: string;
  inventor_approved: boolean | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

const DECISION_LABELS: Record<string, string> = {
  approved: '承認',
  rejected: '却下',
  revoked: '取消'
};

const ERROR_MESSAGES: Record<string, string> = {
  request_id_missing: '申請IDが指定されていません。',
  forbidden: 'この操作にはoperator/admin権限が必要です。',
  invalid_decision: '審査結果の指定が不正です。',
  not_found: '対象の開示申請が見つかりませんでした。',
  invalid_level: '承認レベルの指定が不正です。',
  level_exceeds_request: '承認レベルが申請レベルを超えています。',
  inventor_not_approved: '発明者の開示同意がないため承認できません。',
  nda_required: 'level_2 以上の承認には有効なNDAが必要です。',
  update_failed: '開示申請の更新に失敗しました。'
};

export default async function OperatorDisclosuresPage({
  searchParams
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">開示申請レビュー（ログイン待ち）</h2>
        <p className="text-slate-700">開示申請のレビューにはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: requestRows, error } = await supabase
    .from('company_disclosure_requests')
    .select('id, invention_id, company_account_id, requested_level, approved_level, status, inventor_approved, review_note, reviewed_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">取得エラー</h2>
        <p className="text-slate-700">開示申請の取得に失敗しました。権限（operator/reviewer/admin）をご確認ください。</p>
      </div>
    );
  }

  const requests = (requestRows ?? []) as DisclosureRequest[];

  // 競合同時開示の警告用: 発明ごとに NDA レベル(level_2以上)で承認済みの企業集合を作る。
  const approvedCompaniesByInvention: Record<string, Set<string>> = {};
  for (const r of requests) {
    if (r.status === 'approved' && disclosureLevelRank(r.approved_level) >= 2) {
      (approvedCompaniesByInvention[r.invention_id] ??= new Set()).add(r.company_account_id);
    }
  }

  const inventionTitles: Record<string, string | null> = {};
  const companyNames: Record<string, string | null> = {};
  const activeNdaByCompany: Record<string, boolean> = {};

  if (requests.length > 0) {
    const inventionIds = Array.from(new Set(requests.map((r) => r.invention_id)));
    const companyIds = Array.from(new Set(requests.map((r) => r.company_account_id)));

    const { data: inventions } = await supabase
      .from('inventions')
      .select('id, title')
      .in('id', inventionIds);
    for (const inv of inventions ?? []) {
      inventionTitles[inv.id] = inv.title;
    }

    const { data: companies } = await supabase
      .from('company_accounts')
      .select('id, company_name')
      .in('id', companyIds);
    for (const company of companies ?? []) {
      companyNames[company.id] = company.company_name;
    }

    const nowIso = new Date().toISOString();
    const { data: ndaRows } = await supabase
      .from('nda_acceptances')
      .select('company_account_id, expires_at')
      .in('company_account_id', companyIds)
      .is('revoked_at', null)
      .is('deleted_at', null)
      .not('accepted_at', 'is', null);
    for (const nda of ndaRows ?? []) {
      if (!nda.expires_at || nda.expires_at > nowIso) {
        activeNdaByCompany[nda.company_account_id] = true;
      }
    }
  }

  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  const showSuccess = searchParams?.success === 'reviewed';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">開示申請レビュー（Operator）</h2>
      <Link href="/operator" className="inline-block text-sm text-blue-700 hover:underline">
        Operatorダッシュボードへ戻る
      </Link>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {showSuccess ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">開示申請を更新しました。</p>
      ) : null}

      <p className="text-slate-700">
        承認には発明者の開示同意が必須です。level_2 以上は有効なNDAがある場合のみ承認できます。承認レベルは申請レベル以下に限定されます。
      </p>

      {requests.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">対象の開示申請はありません。</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => {
            const hasNda = activeNdaByCompany[request.company_account_id] ?? false;
            const approvableLevels = DISCLOSURE_APPROVABLE_LEVELS.filter(
              (level) => disclosureLevelRank(level) <= disclosureLevelRank(request.requested_level)
            );
            // 同一発明に対し、他社が NDA レベルで承認済みかどうか（競合警告）。
            const otherApprovedCompanies = Array.from(
              approvedCompaniesByInvention[request.invention_id] ?? new Set<string>()
            ).filter((cid) => cid !== request.company_account_id);
            return (
              <li key={request.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                {otherApprovedCompanies.length > 0 ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    競合注意: この発明は既に他の{otherApprovedCompanies.length}社にNDAレベルの開示が承認されています。同時開示の可否をご確認ください。
                  </p>
                ) : null}
                <div className="space-y-1 text-sm text-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {inventionTitles[request.invention_id] ?? '発明タイトル不明'}
                  </h3>
                  <p>企業: {companyNames[request.company_account_id] ?? '企業名不明'}</p>
                  <p>申請レベル: {disclosureLevelLabel(request.requested_level)}</p>
                  <p>承認済みレベル: {request.approved_level ? disclosureLevelLabel(request.approved_level) : '未承認'}</p>
                  <p>現在の状態: {disclosureRequestStatusLabel(request.status)}</p>
                  <p>発明者の開示同意: {request.inventor_approved ? 'あり' : 'なし'}</p>
                  <p>有効NDA: {hasNda ? 'あり' : 'なし'}</p>
                  <p>審査メモ: {request.review_note || '未記録'}</p>
                  <p className="text-xs text-slate-500">審査日時: {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('ja-JP') : '未審査'}</p>
                </div>

                <form action={reviewDisclosureRequestAction} className="space-y-3 border-t border-slate-200 pt-3">
                  <input type="hidden" name="request_id" value={request.id} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor={`decision_${request.id}`} className="block text-sm font-medium text-slate-700">
                        審査結果
                      </label>
                      <select
                        id={`decision_${request.id}`}
                        name="decision"
                        required
                        defaultValue=""
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          選択してください
                        </option>
                        {DISCLOSURE_REVIEW_DECISIONS.map((decision) => (
                          <option key={decision} value={decision}>
                            {DECISION_LABELS[decision]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={`approved_level_${request.id}`} className="block text-sm font-medium text-slate-700">
                        承認レベル（承認時のみ）
                      </label>
                      <select
                        id={`approved_level_${request.id}`}
                        name="approved_level"
                        defaultValue=""
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">申請レベルと同じ</option>
                        {approvableLevels.map((level) => (
                          <option key={level} value={level}>
                            {DISCLOSURE_LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </div>
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
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        本画面は開示承認の記録のみを行います。企業への発明詳細の実開示・閲覧ログは別の安全な経路（API）で扱います。
      </p>
    </div>
  );
}
