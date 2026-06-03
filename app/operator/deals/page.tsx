import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  DEAL_STATUS_LABELS,
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  dealStatusLabel,
  dealTypeLabel,
  getOperatorDealNextStatuses
} from '@/lib/deal/status';
import { disclosureLevelLabel } from '@/lib/company/disclosure';
import { REVENUE_EVENT_TYPES, REVENUE_EVENT_TYPE_LABELS, formatAmount, revenueEventTypeLabel } from '@/lib/revenue/events';
import { createDealAction, recordRevenueEventAction, updateDealStatusAction } from './actions';

export const dynamic = 'force-dynamic';

type Deal = {
  id: string;
  invention_id: string;
  company_account_id: string;
  disclosure_request_id: string | null;
  deal_type: string;
  status: string;
  proposed_terms_summary: string | null;
  internal_note: string | null;
  created_at: string | null;
};

type ApprovedRequest = {
  id: string;
  invention_id: string;
  company_account_id: string;
  approved_level: string | null;
};

type RevenueEvent = {
  id: string;
  deal_id: string | null;
  event_type: string;
  amount: number | string | null;
  currency: string | null;
  inventor_amount: number | string | null;
  occurred_at: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  deal_id_missing: '取引IDが指定されていません。',
  forbidden: 'この操作にはoperator/admin権限が必要です。',
  status_required: '遷移先ステータスを選択してください。',
  not_found: '対象の取引が見つかりませんでした。',
  same_status: '現在と同じステータスへは遷移できません。',
  invalid_transition: 'その遷移は許可されていません。',
  update_failed: '取引ステータスの更新に失敗しました。',
  status_event_failed: 'ステータスは更新されましたが、イベント記録に失敗しました。',
  disclosure_request_invalid: '起点となる開示申請の指定が不正です。',
  deal_type_invalid: '取引種別の指定が不正です。',
  disclosure_request_not_approved: '承認済みの開示申請のみ取引の起点にできます。',
  deal_already_exists: 'この開示申請からは既に取引が作成されています。',
  create_failed: '取引の新規作成に失敗しました。',
  revenue_type_invalid: '収益イベント種別の指定が不正です。',
  revenue_amount_invalid: '金額は数値で入力してください。',
  revenue_failed: '収益イベントの記録に失敗しました。'
};

const SUCCESS_MESSAGES: Record<string, string> = {
  deal_updated: '取引ステータスを更新しました。',
  deal_created: '取引を新規作成しました。',
  revenue_recorded: '収益イベントを記録しました。'
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
    .select('id, invention_id, company_account_id, disclosure_request_id, deal_type, status, proposed_terms_summary, internal_note, created_at')
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

  // 承認済みの開示申請のうち、まだ deal 化されていないものを取引作成の起点候補にする。
  const { data: approvedRequestRows } = await supabase
    .from('company_disclosure_requests')
    .select('id, invention_id, company_account_id, approved_level')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('reviewed_at', { ascending: false });

  const approvedRequests = (approvedRequestRows ?? []) as ApprovedRequest[];
  const dealRequestIds = new Set(deals.map((d) => d.disclosure_request_id).filter((id): id is string => Boolean(id)));
  const creatableRequests = approvedRequests.filter((r) => !dealRequestIds.has(r.id));

  const inventionTitles: Record<string, string | null> = {};
  const companyNames: Record<string, string | null> = {};

  const inventionIds = Array.from(
    new Set([...deals.map((d) => d.invention_id), ...approvedRequests.map((r) => r.invention_id)])
  );
  const companyIds = Array.from(
    new Set([...deals.map((d) => d.company_account_id), ...approvedRequests.map((r) => r.company_account_id)])
  );

  if (inventionIds.length > 0) {
    const { data: inventions } = await supabase.from('inventions').select('id, title').in('id', inventionIds);
    for (const inv of inventions ?? []) {
      inventionTitles[inv.id] = inv.title;
    }
  }
  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from('company_accounts').select('id, company_name').in('id', companyIds);
    for (const company of companies ?? []) {
      companyNames[company.id] = company.company_name;
    }
  }

  // 収益イベント（operator/reviewer/admin の select RLS）。
  const revenueByDeal: Record<string, RevenueEvent[]> = {};
  if (deals.length > 0) {
    const { data: revenueRows } = await supabase
      .from('revenue_events')
      .select('id, deal_id, event_type, amount, currency, inventor_amount, occurred_at')
      .in(
        'deal_id',
        deals.map((d) => d.id)
      )
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false });
    for (const ev of (revenueRows ?? []) as RevenueEvent[]) {
      if (ev.deal_id) {
        (revenueByDeal[ev.deal_id] ??= []).push(ev);
      }
    }
  }

  const errorMessage = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  const successMessage = searchParams?.success ? SUCCESS_MESSAGES[searchParams.success] : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">取引パイプライン（Operator）</h2>
      <Link href="/operator" className="inline-block text-sm text-blue-700 hover:underline">
        Operatorダッシュボードへ戻る
      </Link>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      <p className="text-slate-700">
        運営が担う取引の新規作成と遷移を操作できます。取引は承認済みの開示申請を起点に作成します。
      </p>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold">取引を新規作成</h3>
        {creatableRequests.length === 0 ? (
          <p className="text-sm text-slate-600">
            取引の起点にできる承認済み開示申請（未取引化）はありません。
          </p>
        ) : (
          <form action={createDealAction} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="disclosure_request_id" className="block text-sm font-medium text-slate-700">
                起点となる開示申請（承認済み）
              </label>
              <select
                id="disclosure_request_id"
                name="disclosure_request_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {creatableRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {inventionTitles[request.invention_id] ?? '発明タイトル不明'} ×{' '}
                    {companyNames[request.company_account_id] ?? '企業名不明'}（{disclosureLevelLabel(request.approved_level)}）
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="deal_type" className="block text-sm font-medium text-slate-700">
                取引種別
              </label>
              <select
                id="deal_type"
                name="deal_type"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {DEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DEAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="proposed_terms_summary"
              rows={2}
              placeholder="提示条件サマリ（任意）"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              name="internal_note"
              rows={2}
              placeholder="内部メモ（任意）"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              取引を作成（初期ステータス: 関心あり）
            </button>
          </form>
        )}
        <p className="text-xs text-slate-500">
          初期ステータスは「関心あり」で作成されます。以降の遷移は各取引のフォームから行います。
        </p>
      </section>

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

                <div className="space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-700">
                  <p className="font-medium">収益イベント</p>
                  {(revenueByDeal[deal.id] ?? []).length === 0 ? (
                    <p className="text-xs text-slate-600">記録された収益イベントはありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {(revenueByDeal[deal.id] ?? []).map((ev) => (
                        <li key={ev.id} className="text-xs text-slate-600">
                          {ev.occurred_at ? new Date(ev.occurred_at).toLocaleDateString('ja-JP') : '日付未設定'} /{' '}
                          {revenueEventTypeLabel(ev.event_type)} / 金額: {formatAmount(ev.amount, ev.currency)} / 発明者分:{' '}
                          {formatAmount(ev.inventor_amount, ev.currency)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={recordRevenueEventAction} className="flex flex-wrap items-end gap-2 pt-1">
                    <input type="hidden" name="deal_id" value={deal.id} />
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">種別</span>
                      <select name="event_type" required defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                        <option value="" disabled>
                          選択
                        </option>
                        {REVENUE_EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {REVENUE_EVENT_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">金額</span>
                      <input name="amount" type="number" step="0.01" placeholder="0" className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    </label>
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">発明者分</span>
                      <input name="inventor_amount" type="number" step="0.01" placeholder="0" className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    </label>
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">通貨</span>
                      <input name="currency" type="text" defaultValue="JPY" className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    </label>
                    <label className="space-y-0.5 text-xs text-slate-600">
                      <span className="block">発生日</span>
                      <input name="occurred_at" type="date" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    </label>
                    <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800">
                      収益を記録
                    </button>
                  </form>
                </div>
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
