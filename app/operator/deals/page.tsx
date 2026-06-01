import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  DEAL_STATUS_LABELS,
  dealStatusLabel,
  dealTypeLabel,
  getOperatorDealNextStatuses
} from '@/lib/deal/status';
import { updateDealStatusAction } from './actions';

export const dynamic = 'force-dynamic';

type Deal = {
  id: string;
  invention_id: string;
  company_account_id: string;
  deal_type: string;
  status: string;
  proposed_terms_summary: string | null;
  internal_note: string | null;
  created_at: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  deal_id_missing: '取引IDが指定されていません。',
  forbidden: 'この操作にはoperator/admin権限が必要です。',
  status_required: '遷移先ステータスを選択してください。',
  not_found: '対象の取引が見つかりませんでした。',
  same_status: '現在と同じステータスへは遷移できません。',
  invalid_transition: 'その遷移は許可されていません。',
  update_failed: '取引ステータスの更新に失敗しました。',
  status_event_failed: 'ステータスは更新されましたが、イベント記録に失敗しました。'
};

export default async function OperatorDealsPage({
  searchParams
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">取引パイプライン（ログイン待ち）</h2>
        <p className="text-slate-700">取引の管理にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: dealRows, error } = await supabase
    .from('deal_pipeline')
    .select('id, invention_id, company_account_id, deal_type, status, proposed_terms_summary, internal_note, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">取得エラー</h2>
        <p className="text-slate-700">取引の取得に失敗しました。権限（operator/reviewer/admin）をご確認ください。</p>
      </div>
    );
  }

  const deals = (dealRows ?? []) as Deal[];

  const inventionTitles: Record<string, string | null> = {};
  const companyNames: Record<string, string | null> = {};

  if (deals.length > 0) {
    const inventionIds = Array.from(new Set(deals.map((d) => d.invention_id)));
    const companyIds = Array.from(new Set(deals.map((d) => d.company_account_id)));

    const { data: inventions } = await supabase.from('inventions').select('id, title').in('id', inventionIds);
    for (const inv of inventions ?? []) {
      inventionTitles[inv.id] = inv.title;
    }

    const { data: companies } = await supabase.from('company_accounts').select('id, company_name').in('id', companyIds);
    for (const company of companies ?? []) {
      companyNames[company.id] = company.company_name;
    }
  }

  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  const showSuccess = searchParams?.success === 'deal_updated';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">取引パイプライン（Operator）</h2>
      <Link href="/operator" className="inline-block text-sm text-blue-700 hover:underline">
        Operatorダッシュボードへ戻る
      </Link>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {showSuccess ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">取引ステータスを更新しました。</p>
      ) : null}

      <p className="text-slate-700">
        運営が担う取引遷移のみを操作できます。会社・発明者起点の遷移、取引の新規作成は本画面の対象外です。
      </p>

      {deals.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">対象の取引はありません。</p>
      ) : (
        <ul className="space-y-4">
          {deals.map((deal) => {
            const nextStatuses = getOperatorDealNextStatuses(deal.status);
            return (
              <li key={deal.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <div className="space-y-1 text-sm text-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900">{inventionTitles[deal.invention_id] ?? '発明タイトル不明'}</h3>
                  <p>企業: {companyNames[deal.company_account_id] ?? '企業名不明'}</p>
                  <p>取引種別: {dealTypeLabel(deal.deal_type)}</p>
                  <p>現在のステータス: {dealStatusLabel(deal.status)}</p>
                  <p>提示条件サマリ: {deal.proposed_terms_summary || '未入力'}</p>
                  <p>内部メモ: {deal.internal_note || '未入力'}</p>
                </div>

                {nextStatuses.length === 0 ? (
                  <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
                    現在のステータスからoperatorが実行できる遷移はありません。
                  </p>
                ) : (
                  <form action={updateDealStatusAction} className="space-y-3 border-t border-slate-200 pt-3">
                    <input type="hidden" name="deal_id" value={deal.id} />
                    <div className="space-y-1">
                      <label htmlFor={`to_status_${deal.id}`} className="block text-sm font-medium text-slate-700">
                        遷移先ステータス
                      </label>
                      <select
                        id={`to_status_${deal.id}`}
                        name="to_status"
                        required
                        defaultValue=""
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          選択してください
                        </option>
                        {nextStatuses.map((status) => (
                          <option key={status} value={status}>
                            {DEAL_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      name="reason"
                      rows={2}
                      placeholder="理由・内部メモ（任意）"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-col gap-1 text-sm text-slate-700">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="visible_to_inventor" />
                        発明者に表示する
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="visible_to_company" />
                        企業に表示する
                      </label>
                    </div>
                    <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      取引ステータスを更新
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        成立条件（licensed/assigned/joint_development）は発明者・企業・運営の合意を前提とします。成功報酬や収益イベントの記録は本画面の対象外です。
      </p>
    </div>
  );
}
