import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { SectionCard } from '@/components/section-card';

export const dynamic = 'force-dynamic';

type InventionSummary = {
  id: string;
  title: string | null;
  problem_summary: string | null;
  status: string;
  created_at: string | null;
};

export default async function InventorPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Inventor Dashboard（ログイン待ち）</h2>
        <p className="text-slate-700">発明者向けの起点です。先にログインしてください。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: inventionRows } = await supabase
    .from('inventions')
    .select('id, title, problem_summary, status, created_at')
    .eq('inventor_id', currentUser.id)
    .in('status', ['draft', 'submitted'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const inventions: InventionSummary[] = inventionRows ?? [];
  const drafts = inventions.filter((item) => item.status === 'draft');
  const submitted = inventions.filter((item) => item.status === 'submitted');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventor Dashboard</h2>
      <p className="text-slate-700">ログイン済みです。本人プロフィールと自分のdraftをRLS越しで参照しています。</p>

      <SectionCard
        title="本人プロフィール"
        description={`表示名: ${currentUser.display_name ?? '未設定'} / メール: ${currentUser.email ?? '未取得'} / 主要ロール: ${currentUser.role ?? '未設定'}`}
        href="/"
        cta="ホームへ"
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">自分のdraft一覧</h3>
          <Link href="/inventor/inventions/new" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
            新しい発明下書きを作成
          </Link>
        </div>

        {drafts.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">下書きはまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{item.title ?? 'タイトル未設定'}</p>
                <p className="mt-1 text-sm text-slate-600">{item.problem_summary || '課題メモ未入力'}</p>
                <p className="mt-2 text-xs text-slate-500">ステータス: {item.status}</p>
                <Link href={`/inventor/inventions/${item.id}`} className="mt-2 inline-block text-sm text-blue-700 hover:underline">
                  詳細を見る
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">提出済みの案件</h3>

        {submitted.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">提出済み案件はまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {submitted.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{item.title ?? 'タイトル未設定'}</p>
                <p className="mt-1 text-sm text-slate-600">{item.problem_summary || '課題メモ未入力'}</p>
                <p className="mt-2 text-xs text-slate-500">ステータス: {item.status}</p>
                <Link href={`/inventor/inventions/${item.id}`} className="mt-2 inline-block text-sm text-blue-700 hover:underline">
                  詳細を見る
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        投稿前チェック、提出、提出後の運営レビューは次フェーズで実装を進めます。
      </p>
      <Link href="/logout" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
        ログアウト
      </Link>
    </div>
  );
}
