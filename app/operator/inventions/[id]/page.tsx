import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

type RouteParams = {
  id: string;
};

type InventionDetail = {
  id: string;
  title: string | null;
  problem_summary: string | null;
  solution_summary: string | null;
  target_users: string | null;
  use_case: string | null;
  similar_products: string | null;
  prototype_status: string | null;
  desired_outcome: string | null;
  status: string;
  submitted_at: string | null;
};

type SubmissionCheck = {
  id: string;
  is_original_inventor: boolean | null;
  has_co_inventors: boolean | null;
  co_inventor_notes: string | null;
  has_employer_or_client_claim_risk: boolean | null;
  employer_or_client_notes: string | null;
  has_public_disclosure: boolean | null;
  public_disclosure_notes: string | null;
  includes_third_party_material: boolean | null;
  third_party_material_notes: string | null;
  nda_pre_disclosure_summary: string | null;
  confidential_detail_notes: string | null;
  accepted_terms: boolean | null;
  accepted_terms_at: string | null;
};

type StatusEvent = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  visible_to_inventor: boolean | null;
  created_at: string | null;
};

export default async function OperatorInventionDetailPage({
  params
}: {
  params: RouteParams;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">ログインしてください</h2>
        <p className="text-slate-700">提出案件詳細はログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: invention, error: inventionError } = await supabase
    .from('inventions')
    .select(
      'id, title, problem_summary, solution_summary, target_users, use_case, similar_products, prototype_status, desired_outcome, status, submitted_at'
    )
    .eq('id', params.id)
    .eq('status', 'submitted')
    .is('deleted_at', null)
    .maybeSingle();

  if (inventionError || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">提出案件が見つかりません</h2>
        <p className="text-slate-700">アクセス対象でないID、または提出済みでない案件です。</p>
        <Link href="/operator/inventions" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  const { data: checks } = await supabase
    .from('invention_submission_checks')
    .select(
      `
      id,
      is_original_inventor,
      has_co_inventors,
      co_inventor_notes,
      has_employer_or_client_claim_risk,
      employer_or_client_notes,
      has_public_disclosure,
      public_disclosure_notes,
      includes_third_party_material,
      third_party_material_notes,
      nda_pre_disclosure_summary,
      confidential_detail_notes,
      accepted_terms,
      accepted_terms_at
    `
    )
    .eq('invention_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const check = checks?.[0] as SubmissionCheck | undefined;

  const { data: statusEvents } = await supabase
    .from('invention_status_events')
    .select('id, from_status, to_status, reason, visible_to_inventor, created_at')
    .eq('invention_id', params.id)
    .order('created_at', { ascending: false });

  const inventionDetail = invention as InventionDetail;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">提出案件詳細（Operator）</h2>
      <Link href="/operator/inventions" className="inline-block text-sm text-blue-700 hover:underline">
        一覧へ戻る
      </Link>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">{inventionDetail.title ?? 'タイトル未設定'}</h3>
        <p className="text-sm text-slate-700">ステータス: {inventionDetail.status}</p>
        <p className="text-sm text-slate-700">提出時刻: {inventionDetail.submitted_at ? new Date(inventionDetail.submitted_at).toLocaleString('ja-JP') : '未設定'}</p>
        <div className="space-y-2 text-sm text-slate-700">
          <p>対象ユーザー: {inventionDetail.target_users ?? '未入力'}</p>
          <p>使用シーン: {inventionDetail.use_case ?? '未入力'}</p>
          <p>試作状況: {inventionDetail.prototype_status ?? '未入力'}</p>
          <p>求める成果: {inventionDetail.desired_outcome ?? '未入力'}</p>
          <p>課題: {inventionDetail.problem_summary ?? '未入力'}</p>
          <p>解決方針: {inventionDetail.solution_summary ?? '未入力'}</p>
          <p>既知類似: {inventionDetail.similar_products ?? '未入力'}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-semibold">投稿前チェック</h4>
        {!check ? (
          <p className="text-sm text-slate-600">投稿前チェックはまだありません。</p>
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p>発明者本人チェック: {check.is_original_inventor ? 'あり' : 'なし'}</p>
            <p>共同発明者: {check.has_co_inventors ? 'あり' : 'なし'}</p>
            <p>共同発明者ノート: {check.co_inventor_notes || '未入力'}</p>
            <p>勤務先/委託先権利帰属想定: {check.has_employer_or_client_claim_risk ? 'あり' : 'なし'}</p>
            <p>勤務先/委託ノート: {check.employer_or_client_notes || '未入力'}</p>
            <p>公開情報あり: {check.has_public_disclosure ? 'あり' : 'なし'}</p>
            <p>公開情報ノート: {check.public_disclosure_notes || '未入力'}</p>
            <p>第三者素材: {check.includes_third_party_material ? 'あり' : 'なし'}</p>
            <p>第三者素材ノート: {check.third_party_material_notes || '未入力'}</p>
            <p>NDA前要約: {check.nda_pre_disclosure_summary || '未入力'}</p>
            <p>機密詳細: {check.confidential_detail_notes || '未入力'}</p>
            <p>同意: {check.accepted_terms ? '有効' : '未同意'}</p>
            <p>同意時刻: {check.accepted_terms_at ? new Date(check.accepted_terms_at).toLocaleString('ja-JP') : '未記録'}</p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-semibold">状態イベント（最小表示）</h4>
        {!statusEvents || statusEvents.length === 0 ? (
          <p className="text-sm text-slate-600">イベントはまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {statusEvents.map((event: StatusEvent) => (
              <li key={event.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-sm text-slate-700">
                <p>
                  {event.from_status ?? '未設定'} → {event.to_status ?? '未設定'}
                </p>
                <p className="text-xs text-slate-500">作成日: {event.created_at ? new Date(event.created_at).toLocaleString('ja-JP') : '未設定'}</p>
                <p className="text-xs text-slate-500">inventor可視: {event.visible_to_inventor ? 'あり' : 'なし'}</p>
                <p className="text-xs text-slate-500">理由: {event.reason || '未入力'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        このページは表示のみです。編集・審査反映・ステータス更新・開示操作は未実装です。
      </p>
    </div>
  );
}
