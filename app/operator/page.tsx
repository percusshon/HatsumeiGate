import Link from 'next/link';
import { SectionCard } from '@/components/section-card';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export default async function OperatorPage() {
  const currentUser = await getCurrentUser();
  const canSeeOperatorView = currentUser?.roles?.some((role) => ['operator', 'reviewer', 'admin'].includes(role));

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Operator Dashboard（ログイン待ち）</h2>
        <p className="text-slate-700">運営向けの審査起点ページです。先にログインしてください。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Operator Dashboard</h2>
      <p className="text-slate-700">
        ログイン済みユーザーで、提出済み案件をRLS越しで閲覧できます。現在は一覧・詳細閲覧の最小MVPです。
      </p>

      <SectionCard
        title="提出済み案件一覧"
        description="status = submitted の案件を表示し、運営判断に必要な要約情報を確認します。"
        href="/operator/inventions"
        cta="提出済み案件を見る"
      />

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700">現在の主なロール: {currentUser.role ?? '未設定'}</p>
        <p className="mt-1 text-sm text-slate-700">補助ロール: {currentUser.roles.join(', ') || 'なし'}</p>
        <p className="mt-2 text-sm text-slate-600">
          {canSeeOperatorView
            ? '提出案件閲覧条件はRLSで制御します。'
            : 'このユーザーはoperator/reviewer/adminロール外のため、一覧は空になる想定です。'}
        </p>
      </div>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        実装未着手の領域: 審査レポート作成、ステータス変更、企業開示操作、ファイル公開、signed URL。
      </p>
    </div>
  );
}
