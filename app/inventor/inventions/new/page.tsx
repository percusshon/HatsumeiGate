import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createDraftAction } from '../actions';

type SearchParams = {
  error?: string | string[];
};

export default async function NewInventionPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">ログインしてください</h2>
        <p className="text-slate-700">発明の下書き作成はログイン後に利用できます。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const error = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const errorMessage =
    error === 'title_required'
      ? 'titleは必須です。'
      : error === 'create_failed'
        ? '下書きの作成に失敗しました。再試行してください。'
        : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">新しい発明下書き</h2>
      <p className="text-slate-700">以下は最小MVPのdraft作成です。保存後の審査・提出は次フェーズで追加します。</p>

      <form action={createDraftAction} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="title">
            title（必須）
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="例: 会議中の音源整理を自動で行うアプリ"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="problem_summary">
            problem_summary
          </label>
          <textarea
            id="problem_summary"
            name="problem_summary"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="解決したい課題を簡潔に入力"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="solution_summary">
            solution_summary
          </label>
          <textarea
            id="solution_summary"
            name="solution_summary"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="発明の仕組みやアイデアの核心"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="target_user">
            target_user
          </label>
          <input
            id="target_user"
            name="target_user"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="想定ユーザー（例: 音楽制作者）"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="use_case">
            use_case
          </label>
          <textarea
            id="use_case"
            name="use_case"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="利用シーンを入力"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="similar_products">
            similar_products
          </label>
          <textarea
            id="similar_products"
            name="similar_products"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="近い既存製品・サービス"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="prototype_status">
            prototype_status
          </label>
          <input
            id="prototype_status"
            name="prototype_status"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="試作品の有無（例: なし/進行中）"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="desired_outcome">
            desired_outcome
          </label>
          <textarea
            id="desired_outcome"
            name="desired_outcome"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="目標結果"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          下書きを保存
        </button>
      </form>

      {errorMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p> : null}
      <Link href="/inventor" className="inline-block text-sm text-blue-700 hover:underline">
        Inventorダッシュボードへ戻る
      </Link>
    </div>
  );
}
