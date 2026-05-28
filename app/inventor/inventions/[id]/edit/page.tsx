import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { updateDraftAction } from '../../actions';

type Params = {
  id: string;
};

type SearchParams = {
  error?: string | string[];
};

export default async function EditInventionDraftPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">ログインしてください</h2>
        <p className="text-slate-700">下書き編集はログイン後に利用できます。</p>
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
      'id, title, problem_summary, solution_summary, target_users, use_case, similar_products, prototype_status, desired_outcome, status'
    )
    .eq('id', params.id)
    .eq('inventor_id', currentUser.id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">下書きが見つかりません</h2>
        <p className="text-slate-700">アクセスできないID、または他ユーザーの提出前下書きです。</p>
        <Link href="/inventor" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
          Inventorダッシュボードへ戻る
        </Link>
      </div>
    );
  }

  const errorType = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const errorMessage =
    errorType === 'title_required'
      ? 'titleは必須です。'
      : errorType === 'update_failed'
        ? '下書きの更新に失敗しました。再試行してください。'
        : errorType === 'invention_id_missing'
          ? '対象の発明を特定できませんでした。'
          : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">下書きを編集</h2>
      <p className="text-slate-700">保存すると下書きとして自分だけが閲覧・編集できます。</p>

      <form action={updateDraftAction} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <input type="hidden" name="invention_id" value={invention.id} />

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="title">
            title（必須）
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={invention.title}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.problem_summary ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.solution_summary ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.target_users ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.use_case ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.similar_products ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.prototype_status ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            defaultValue={invention.desired_outcome ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          下書きを更新
        </button>
      </form>

      {errorMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p> : null}

      <div className="flex gap-3">
        <Link href={`/inventor/inventions/${invention.id}`} className="inline-block text-sm text-blue-700 hover:underline">
          詳細に戻る
        </Link>
        <Link href="/inventor" className="inline-block text-sm text-slate-700 hover:underline">
          Inventorダッシュボードへ戻る
        </Link>
      </div>
    </div>
  );
}
