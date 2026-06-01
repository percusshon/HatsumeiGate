import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { inventorFacingStatusLabel } from '@/lib/invention/status';
import { disclosureLevelLabel, disclosureRequestStatusLabel } from '@/lib/company/disclosure';
import { setDisclosureApprovalAction } from './disclosure-actions';

type SearchParams = {
  id: string;
};

type InventorStatusEvent = {
  id: string;
  to_status: string | null;
  reason: string | null;
  created_at: string | null;
};

type InventorDisclosureRequest = {
  id: string;
  requested_level: string;
  approved_level: string | null;
  status: string;
  inventor_approved: boolean | null;
  created_at: string | null;
};

const NOTICE_MESSAGES: Record<string, string> = {
  invalid_request: '開示申請の指定が不正です。',
  approval_failed: '開示同意の更新に失敗しました。'
};

const SUCCESS_MESSAGES: Record<string, string> = {
  disclosure_approved: '開示に同意しました。',
  disclosure_revoked: '開示同意を取り消しました。'
};

export default async function InventionDetailPage({
  params,
  searchParams
}: {
  params: SearchParams;
  searchParams?: { error?: string; success?: string };
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">ログインしてください</h2>
        <p className="text-slate-700">発明詳細はログイン後にのみ参照できます。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: invention, error } = await supabase
    .from('inventions')
    .select(
      'id, title, problem_summary, solution_summary, target_users, use_case, similar_products, prototype_status, desired_outcome, status, created_at'
    )
    .eq('id', params.id)
    .eq('inventor_id', currentUser.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">発明が見つかりません</h2>
        <p className="text-slate-700">アクセスできないID、または他のユーザーの案件です。</p>
        <Link href="/inventor" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
          Inventorダッシュボードへ戻る
        </Link>
      </div>
    );
  }

  // RLS（invention_status_events_select_visible_own）により、
  // 発明者には visible_to_inventor = true のイベントのみ返る。
  const { data: statusEventRows } = await supabase
    .from('invention_status_events')
    .select('id, to_status, reason, created_at')
    .eq('invention_id', params.id)
    .order('created_at', { ascending: false });
  const statusEvents = (statusEventRows ?? []) as InventorStatusEvent[];

  // RLS（company_disclosure_requests_select_own_inventor）により、
  // 発明者には自分の発明に対する開示申請のみ返る。
  const { data: disclosureRows } = await supabase
    .from('company_disclosure_requests')
    .select('id, requested_level, approved_level, status, inventor_approved, created_at')
    .eq('invention_id', params.id)
    .order('created_at', { ascending: false });
  const disclosureRequests = (disclosureRows ?? []) as InventorDisclosureRequest[];

  const noticeMessage = searchParams?.error ? NOTICE_MESSAGES[searchParams.error] : undefined;
  const successMessage = searchParams?.success ? SUCCESS_MESSAGES[searchParams.success] : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">発明詳細</h2>

      {noticeMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{noticeMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMessage}</p>
      ) : null}
      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">{invention.title}</h3>
        <p className="text-sm text-slate-700">ステータス: {inventorFacingStatusLabel(invention.status)}</p>
        <div className="space-y-2 text-sm text-slate-700">
          <p>対象ユーザー: {invention.target_users ?? '未入力'}</p>
          <p>使用シーン: {invention.use_case ?? '未入力'}</p>
          <p>試作品状態: {invention.prototype_status ?? '未入力'}</p>
          <p>求める成果: {invention.desired_outcome ?? '未入力'}</p>
          <p>課題: {invention.problem_summary ?? '未入力'}</p>
          <p>解決方針: {invention.solution_summary ?? '未入力'}</p>
          <p>類似製品/サービス: {invention.similar_products ?? '未入力'}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {invention.status === 'draft' ? (
          <>
            <Link
              href={`/inventor/inventions/${invention.id}/edit`}
              className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              下書きを編集
            </Link>
            <Link
              href={`/inventor/inventions/${invention.id}/submit`}
              className="inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              投稿前チェックへ進む
            </Link>
          </>
        ) : null}
      </div>

      {invention.status !== 'draft' ? (
        <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
          <h4 className="text-lg font-semibold">審査・進捗の履歴</h4>
          {statusEvents.length === 0 ? (
            <p className="text-sm text-slate-600">運営からの共有はまだありません。</p>
          ) : (
            <ul className="space-y-2">
              {statusEvents.map((event) => (
                <li key={event.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-sm text-slate-700">
                  <p>状態: {inventorFacingStatusLabel(event.to_status)}</p>
                  {event.reason ? <p className="text-xs text-slate-600">メッセージ: {event.reason}</p> : null}
                  <p className="text-xs text-slate-500">
                    {event.created_at ? new Date(event.created_at).toLocaleString('ja-JP') : '日時未設定'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">詳細開示や審査の内部情報は運営フローで管理されます。</p>
        </section>
      ) : null}

      {disclosureRequests.length > 0 ? (
        <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
          <h4 className="text-lg font-semibold">企業への開示同意</h4>
          <p className="text-sm text-slate-600">
            あなたの発明を企業へ開示するには、あなたの同意が必要です。内容を確認のうえ同意/取消を選べます。
          </p>
          <ul className="space-y-3">
            {disclosureRequests.map((request) => (
              <li key={request.id} className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                <p>申請レベル: {disclosureLevelLabel(request.requested_level)}</p>
                <p>承認レベル: {request.approved_level ? disclosureLevelLabel(request.approved_level) : '未承認'}</p>
                <p>申請状態: {disclosureRequestStatusLabel(request.status)}</p>
                <p>あなたの同意: {request.inventor_approved ? '同意済み' : '未同意'}</p>
                <form action={setDisclosureApprovalAction} className="flex flex-wrap gap-2 pt-1">
                  <input type="hidden" name="invention_id" value={invention.id} />
                  <input type="hidden" name="request_id" value={request.id} />
                  {request.inventor_approved ? (
                    <button
                      type="submit"
                      name="decision"
                      value="revoke"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      同意を取り消す
                    </button>
                  ) : (
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
                    >
                      開示に同意する
                    </button>
                  )}
                </form>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            同意しても、実際の開示はNDA締結・運営承認・閲覧ログを満たした場合に限られます。
          </p>
        </section>
      ) : null}

      <Link href="/inventor" className="inline-block text-sm text-blue-700 hover:underline">
        Inventorダッシュボードへ戻る
      </Link>
    </div>
  );
}
