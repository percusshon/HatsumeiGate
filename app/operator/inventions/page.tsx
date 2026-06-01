import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { OPERATOR_REVIEW_STATUSES, inventionStatusLabel } from '@/lib/invention/status';

export const dynamic = 'force-dynamic';

type InventionSummary = {
  id: string;
  title: string | null;
  problem_summary: string | null;
  target_users: string | null;
  submitted_at: string | null;
  status: string;
};

export default async function OperatorInventionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Operator Inventions（ログイン待ち）</h2>
        <p className="text-slate-700">提出案件を確認するにはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: inventionRows, error } = await supabase
    .from('inventions')
    .select('id, title, problem_summary, target_users, submitted_at, status')
    .in('status', OPERATOR_REVIEW_STATUSES)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">取得エラー</h2>
        <p className="text-slate-700">提出済み案件の取得に失敗しました。</p>
      </div>
    );
  }

  const inventions: InventionSummary[] = inventionRows ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">審査対象 発明一覧（Operator）</h2>
      <p className="text-slate-700">自分の権限とRLSで見える内部審査フェーズの案件のみを表示します。</p>

      <Link href="/operator" className="inline-block text-sm text-blue-700 hover:underline">
        Operatorダッシュボードへ戻る
      </Link>

      {inventions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">表示対象の審査中案件はありません。</p>
      ) : (
        <ul className="space-y-3">
          {inventions.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-slate-900">{item.title ?? 'タイトル未設定'}</h3>
              <p className="mt-1 text-sm text-slate-700">課題: {item.problem_summary ?? '未入力'}</p>
              <p className="mt-1 text-sm text-slate-700">想定対象: {item.target_users ?? '未入力'}</p>
              <p className="mt-1 text-xs text-slate-500">提出時刻: {item.submitted_at ? new Date(item.submitted_at).toLocaleString('ja-JP') : '未提出'}</p>
              <p className="mt-1 text-xs text-slate-500">ステータス: {inventionStatusLabel(item.status)}</p>
              <Link
                href={`/operator/inventions/${item.id}`}
                className="mt-3 inline-block rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-slate-50"
              >
                詳細を見る
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
