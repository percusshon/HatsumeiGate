import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { inventionStatusLabel } from '@/lib/invention/status';
import { ipStrategyTypeLabel, priorArtRiskLabel } from '@/lib/invention/ip-strategy';
import { screeningRatingLabel } from '@/lib/invention/screening';

export const dynamic = 'force-dynamic';

type AssignedInvention = {
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
};

type ScreeningReport = {
  id: string;
  invention_id: string;
  overall_rating: string | null;
  summary: string | null;
  recommendation: string | null;
  created_at: string | null;
};

type PriorArtItem = {
  id: string;
  invention_id: string;
  title: string | null;
  source_url: string | null;
  risk_level: string | null;
  summary: string | null;
};

type IpStrategyNote = {
  id: string;
  invention_id: string;
  strategy_type: string;
  note: string | null;
  requires_attorney_review: boolean | null;
};

export default async function PartnerPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Patent Partner Portal（ログイン待ち）</h2>
        <p className="text-slate-700">割当案件の閲覧にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  if (!currentUser.roles.includes('patent_attorney_partner')) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Patent Partner Portal</h2>
        <p className="text-slate-700">この画面は弁理士パートナー向けです。割当案件のみ閲覧できます。</p>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();

  // RLS（inventions_select_partner_assigned）により、割当済み案件のみ返る。
  const { data: inventionRows } = await supabase
    .from('inventions')
    .select(
      'id, title, problem_summary, solution_summary, target_users, use_case, similar_products, prototype_status, desired_outcome, status'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const inventions = (inventionRows ?? []) as AssignedInvention[];

  const reportsByInvention: Record<string, ScreeningReport[]> = {};
  const priorArtByInvention: Record<string, PriorArtItem[]> = {};
  const ipNotesByInvention: Record<string, IpStrategyNote[]> = {};

  if (inventions.length > 0) {
    const ids = inventions.map((i) => i.id);

    const { data: reportRows } = await supabase
      .from('invention_screening_reports')
      .select('id, invention_id, overall_rating, summary, recommendation, created_at')
      .in('invention_id', ids)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    for (const r of (reportRows ?? []) as ScreeningReport[]) {
      (reportsByInvention[r.invention_id] ??= []).push(r);
    }

    const { data: priorArtRows } = await supabase
      .from('prior_art_items')
      .select('id, invention_id, title, source_url, risk_level, summary')
      .in('invention_id', ids)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    for (const p of (priorArtRows ?? []) as PriorArtItem[]) {
      (priorArtByInvention[p.invention_id] ??= []).push(p);
    }

    const { data: ipRows } = await supabase
      .from('ip_strategy_notes')
      .select('id, invention_id, strategy_type, note, requires_attorney_review')
      .in('invention_id', ids)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    for (const n of (ipRows ?? []) as IpStrategyNote[]) {
      (ipNotesByInvention[n.invention_id] ??= []).push(n);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Patent Partner Portal</h2>
      <p className="text-slate-700">
        運営が割り当てた案件のみを読み取り専用で確認できます。本画面は相談準備用途で、編集・特許手続の代理は行いません。
      </p>

      {inventions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">割当中の案件はありません。</p>
      ) : (
        <ul className="space-y-4">
          {inventions.map((invention) => {
            const reports = reportsByInvention[invention.id] ?? [];
            const priorArt = priorArtByInvention[invention.id] ?? [];
            const ipNotes = ipNotesByInvention[invention.id] ?? [];
            return (
              <li key={invention.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
                <div className="space-y-1 text-sm text-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900">{invention.title ?? 'タイトル未設定'}</h3>
                  <p className="text-xs text-slate-500">ステータス: {inventionStatusLabel(invention.status)}</p>
                  <p>課題: {invention.problem_summary ?? '未入力'}</p>
                  <p>解決方針: {invention.solution_summary ?? '未入力'}</p>
                  <p>対象ユーザー: {invention.target_users ?? '未入力'}</p>
                  <p>使用シーン: {invention.use_case ?? '未入力'}</p>
                  <p>既知類似: {invention.similar_products ?? '未入力'}</p>
                  <p>試作状況: {invention.prototype_status ?? '未入力'}</p>
                  <p>求める成果: {invention.desired_outcome ?? '未入力'}</p>
                </div>

                <div className="space-y-1 border-t border-slate-200 pt-2 text-sm text-slate-700">
                  <p className="font-medium">審査レポート</p>
                  {reports.length === 0 ? (
                    <p className="text-xs text-slate-600">レポートはありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {reports.map((r) => (
                        <li key={r.id} className="text-xs text-slate-600">
                          判定: {screeningRatingLabel(r.overall_rating)} / 要約: {r.summary || '未入力'} / 推奨:{' '}
                          {r.recommendation || '未入力'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  <p className="font-medium">先行技術</p>
                  {priorArt.length === 0 ? (
                    <p className="text-xs text-slate-600">先行技術メモはありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {priorArt.map((p) => (
                        <li key={p.id} className="text-xs text-slate-600">
                          {p.title || 'タイトル未設定'} / リスク: {priorArtRiskLabel(p.risk_level)} / {p.summary || '要約なし'}
                          {p.source_url ? ` / ${p.source_url}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  <p className="font-medium">知財方針ノート</p>
                  {ipNotes.length === 0 ? (
                    <p className="text-xs text-slate-600">知財方針ノートはありません。</p>
                  ) : (
                    <ul className="space-y-1">
                      {ipNotes.map((n) => (
                        <li key={n.id} className="text-xs text-slate-600">
                          {ipStrategyTypeLabel(n.strategy_type)} / {n.note || 'メモなし'} / 弁理士レビュー:{' '}
                          {n.requires_attorney_review ? '要' : '不要'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-xs text-slate-500">
        本画面は読み取り専用です。法的助言・特許手続の代理表示は避け、運営の代行判断にならない表現に留めます。
      </p>
    </div>
  );
}
