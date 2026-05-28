import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

type SearchParams = {
  id: string;
};

export default async function InventionDetailPage({
  params
}: {
  params: SearchParams;
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
    .in('status', ['draft', 'submitted'])
    .maybeSingle();

  if (error || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">発明が見つかりません</h2>
        <p className="text-slate-700">アクセスできないID、または他のユーザーの下書きです。</p>
        <Link href="/inventor" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
          Inventorダッシュボードへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">発明下書き詳細</h2>
      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">{invention.title}</h3>
        <p className="text-sm text-slate-700">ステータス: {invention.status}</p>
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

      {invention.status === 'submitted' ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          この案件は提出済みです。詳細開示や審査管理は運営フローで扱います。
        </div>
      ) : null}

      <Link href="/inventor" className="inline-block text-sm text-blue-700 hover:underline">
        Inventorダッシュボードへ戻る
      </Link>
    </div>
  );
}
