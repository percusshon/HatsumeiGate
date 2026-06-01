import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  OPERATOR_REVIEW_STATUSES,
  getOperatorNextStatuses,
  inventionStatusLabel
} from '@/lib/invention/status';
import {
  SCREENING_AXES,
  SCREENING_RATINGS,
  screeningAxisLabel,
  screeningRatingLabel,
  SCREENING_RATING_LABELS,
  SCREENING_AXIS_LABELS,
  SCREENING_SCORE_MAX,
  SCREENING_SCORE_MIN
} from '@/lib/invention/screening';
import { updateInventionStatusAction } from './actions';
import { createScreeningReportAction } from './screening-actions';

type RouteParams = {
  id: string;
};

const STATUS_ERROR_MESSAGES: Record<string, string> = {
  invention_id_missing: '案件IDが指定されていません。',
  forbidden: 'この操作には権限（operator/reviewer/admin）が必要です。',
  status_required: '遷移先ステータスを選択してください。',
  not_found: '対象案件が見つかりませんでした。',
  same_status: '現在と同じステータスへは遷移できません。',
  invalid_transition: 'その遷移は許可されていません。',
  update_failed: 'ステータス更新に失敗しました。',
  status_event_failed: 'ステータスは更新されましたが、イベント記録に失敗しました。',
  report_failed: '審査レポートの保存に失敗しました。',
  score_failed: 'レポートは保存されましたが、スコア記録に失敗しました。',
  invalid_score: 'スコアは0〜5の整数で入力してください。',
  empty_report: '審査レポートに少なくとも1項目を入力してください。'
};

const SUCCESS_MESSAGES: Record<string, string> = {
  status_updated: 'ステータスを更新しました。',
  report_created: '審査レポートを保存しました。'
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

type ScreeningScore = {
  id: string;
  report_id: string;
  axis: string;
  score: number;
  rationale: string | null;
};

type ScreeningReport = {
  id: string;
  overall_rating: string | null;
  summary: string | null;
  recommendation: string | null;
  next_action: string | null;
  created_at: string | null;
};

export default async function OperatorInventionDetailPage({
  params,
  searchParams
}: {
  params: RouteParams;
  searchParams?: { error?: string; success?: string };
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
    .in('status', OPERATOR_REVIEW_STATUSES)
    .is('deleted_at', null)
    .maybeSingle();

  if (inventionError || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">審査対象案件が見つかりません</h2>
        <p className="text-slate-700">アクセス対象でないID、または審査フェーズ外の案件です。</p>
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

  const { data: reportRows } = await supabase
    .from('invention_screening_reports')
    .select('id, overall_rating, summary, recommendation, next_action, created_at')
    .eq('invention_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const reports = (reportRows ?? []) as ScreeningReport[];

  const scoresByReport: Record<string, ScreeningScore[]> = {};
  if (reports.length > 0) {
    const { data: scoreRows } = await supabase
      .from('invention_screening_scores')
      .select('id, report_id, axis, score, rationale')
      .in(
        'report_id',
        reports.map((report) => report.id)
      )
      .is('deleted_at', null);

    for (const score of (scoreRows ?? []) as ScreeningScore[]) {
      (scoresByReport[score.report_id] ??= []).push(score);
    }
  }

  const inventionDetail = invention as InventionDetail;
  const nextStatuses = getOperatorNextStatuses(inventionDetail.status);
  const errorMessage = searchParams?.error ? STATUS_ERROR_MESSAGES[searchParams.error] : undefined;
  const successMessage = searchParams?.success ? SUCCESS_MESSAGES[searchParams.success] : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">審査案件詳細（Operator）</h2>
      <Link href="/operator/inventions" className="inline-block text-sm text-blue-700 hover:underline">
        一覧へ戻る
      </Link>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">{inventionDetail.title ?? 'タイトル未設定'}</h3>
        <p className="text-sm text-slate-700">ステータス: {inventionStatusLabel(inventionDetail.status)}</p>
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

      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-semibold">審査レポート</h4>

        {reports.length === 0 ? (
          <p className="text-sm text-slate-600">審査レポートはまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => {
              const scores = scoresByReport[report.id] ?? [];
              return (
                <li key={report.id} className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">総合判定: {screeningRatingLabel(report.overall_rating)}</p>
                  <p className="text-xs text-slate-500">
                    作成日: {report.created_at ? new Date(report.created_at).toLocaleString('ja-JP') : '未設定'}
                  </p>
                  <p>要約: {report.summary || '未入力'}</p>
                  <p>推奨アクション: {report.recommendation || '未入力'}</p>
                  <p>次アクション: {report.next_action || '未入力'}</p>
                  {scores.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {scores.map((score) => (
                        <li key={score.id} className="text-xs text-slate-600">
                          {screeningAxisLabel(score.axis)}: {score.score} / {SCREENING_SCORE_MAX}
                          {score.rationale ? `（${score.rationale}）` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">軸別スコアの記録はありません。</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form action={createScreeningReportAction} className="space-y-4 border-t border-slate-200 pt-4">
          <input type="hidden" name="invention_id" value={inventionDetail.id} />
          <p className="text-sm font-medium text-slate-700">新規審査レポートを追加</p>

          <div className="space-y-1">
            <label htmlFor="overall_rating" className="block text-sm font-medium text-slate-700">
              総合判定（A〜E・任意）
            </label>
            <select
              id="overall_rating"
              name="overall_rating"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">未判定</option>
              {SCREENING_RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {SCREENING_RATING_LABELS[rating]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="summary" className="block text-sm font-medium text-slate-700">
              要約（任意）
            </label>
            <textarea id="summary" name="summary" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1">
            <label htmlFor="recommendation" className="block text-sm font-medium text-slate-700">
              推奨アクション（任意）
            </label>
            <textarea id="recommendation" name="recommendation" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1">
            <label htmlFor="next_action" className="block text-sm font-medium text-slate-700">
              次アクション・期限（任意）
            </label>
            <textarea id="next_action" name="next_action" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">評価軸スコア（各 {SCREENING_SCORE_MIN}〜{SCREENING_SCORE_MAX}・任意）</p>
            {SCREENING_AXES.map((axis) => (
              <div key={axis} className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_5rem_1fr] sm:items-center">
                <label htmlFor={`score_${axis}`} className="text-sm text-slate-700">
                  {SCREENING_AXIS_LABELS[axis]}
                </label>
                <input
                  id={`score_${axis}`}
                  name={`score_${axis}`}
                  type="number"
                  min={SCREENING_SCORE_MIN}
                  max={SCREENING_SCORE_MAX}
                  step={1}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name={`rationale_${axis}`}
                  type="text"
                  placeholder="根拠（任意）"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            審査レポートを保存
          </button>
        </form>

        <p className="text-xs text-slate-500">
          発明者向け要約と内部詳細の表示分離・編集・削除は今後の増分で扱います。断定的な保証表現は記載しないでください。
        </p>
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
                  {inventionStatusLabel(event.from_status)} → {inventionStatusLabel(event.to_status)}
                </p>
                <p className="text-xs text-slate-500">作成日: {event.created_at ? new Date(event.created_at).toLocaleString('ja-JP') : '未設定'}</p>
                <p className="text-xs text-slate-500">inventor可視: {event.visible_to_inventor ? 'あり' : 'なし'}</p>
                <p className="text-xs text-slate-500">理由: {event.reason || '未入力'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-semibold">ステータス更新（内部審査）</h4>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-slate-600">
            現在のステータスからoperatorが実行できる内部審査遷移はありません。
          </p>
        ) : (
          <form action={updateInventionStatusAction} className="space-y-4">
            <input type="hidden" name="invention_id" value={inventionDetail.id} />

            <div className="space-y-1">
              <label htmlFor="to_status" className="block text-sm font-medium text-slate-700">
                遷移先ステータス
              </label>
              <select
                id="to_status"
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
                    {inventionStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
                理由・内部メモ（任意）
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="遷移の判断理由など"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="visible_to_inventor" />
              この更新を発明者に表示する
            </label>

            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              ステータスを更新
            </button>
          </form>
        )}
        <p className="text-xs text-slate-500">
          企業開示・NDA・取引（deal）に関わる遷移は本画面の対象外です。
        </p>
      </section>
    </div>
  );
}
