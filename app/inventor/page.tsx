import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { SectionCard } from '@/components/section-card';

export const dynamic = 'force-dynamic';

export default async function InventorPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Inventor Dashboard（ログイン待ち）</h2>
        <p className="text-slate-700">
          こちらは発明者向けダッシュボードの起点です。先にログインしてください。
        </p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventor Dashboard</h2>
      <p className="text-slate-700">ログイン済みです。本人プロフィールをRLS経由で参照しています。</p>
      <SectionCard
        title="本人プロフィール"
        description={`表示名: ${currentUser.display_name ?? '未設定'} / メール: ${currentUser.email ?? '未取得'} / 主要ロール: ${currentUser.role ?? '未設定'}`}
        href="/"
        cta="ホームへ"
      />
      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        次フェーズで、投稿フォーム・ステータス履歴・開示依頼フローを追加します。
      </p>
      <Link href="/logout" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
        ログアウト
      </Link>
    </div>
  );
}
