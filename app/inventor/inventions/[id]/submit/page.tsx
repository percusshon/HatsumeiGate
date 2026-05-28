import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { submitDraftAction } from '../../actions';

type Params = {
  id: string;
};

type SearchParams = {
  error?: string | string[];
};

export default async function SubmitInventionPage({
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
        <p className="text-slate-700">投稿前チェックはログイン後にのみ実行できます。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: invention, error } = await supabase
    .from('inventions')
    .select('id, title, status')
    .eq('id', params.id)
    .eq('inventor_id', currentUser.id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !invention) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">提出対象が見つかりません</h2>
        <p className="text-slate-700">アクセス権のないID、または既に提出済みの案件です。</p>
        <Link href="/inventor" className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
          Inventorダッシュボードへ戻る
        </Link>
      </div>
    );
  }

  const errorType = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const errorMessage =
    errorType === 'not_original'
      ? '発明者本人チェックが必要です。'
      : errorType === 'terms_not_accepted'
        ? '利用規約チェックの同意が必要です。'
        : errorType === 'invalid_invention'
          ? '対象を特定できません。自分のドラフトであることを確認してください。'
          : errorType === 'check_save_failed'
            ? '投稿前チェックの保存に失敗しました。'
            : errorType === 'submit_failed'
              ? '提出更新に失敗しました。RLSや権限制約をご確認ください。'
              : errorType === 'status_event_failed'
                ? '提出状態イベントの記録に失敗しました。'
                : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">投稿前チェック</h2>
      <p className="text-slate-700">発明が企業側へ共有される前の、本人確認・公開リスク整理です。</p>
      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
        NDA前に共有できる範囲（要約）と、機密詳細（提出前に取り扱い注意）を分けて登録してください。保証を意味するものではありません。
      </p>
      <h3 className="text-lg font-semibold">対象: {invention.title ?? 'タイトル未設定'}</h3>

      <form action={submitDraftAction} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <input type="hidden" name="invention_id" value={invention.id} />

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="is_original_inventor" type="checkbox" value="true" />
            発明者本人ですか？（本人情報のみを送信する想定です）
          </label>
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="has_co_inventors" type="checkbox" value="true" />
            共同発明者がいますか？
          </label>
          <textarea
            id="co_inventor_notes"
            name="co_inventor_notes"
            rows={2}
            placeholder="共同発明者がいる場合は氏名や連絡先の有無を要約してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="has_employer_or_client_claim_risk" type="checkbox" value="true" />
            勤務先/顧問先/委託元の権利帰属が想定されますか？
          </label>
          <textarea
            id="employer_or_client_notes"
            name="employer_or_client_notes"
            rows={2}
            placeholder="権利帰属の懸念内容を簡潔に記載してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="has_public_disclosure" type="checkbox" value="true" />
            既に公開情報化されていますか？
          </label>
          <textarea
            id="public_disclosure_notes"
            name="public_disclosure_notes"
            rows={2}
            placeholder="公開媒体・日時・内容を記載してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="includes_third_party_material" type="checkbox" value="true" />
            第三者素材（画像/コード/資料）を含みますか？
          </label>
          <textarea
            id="third_party_material_notes"
            name="third_party_material_notes"
            rows={2}
            placeholder="素材の出典や使用範囲を記載してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="nda_pre_disclosure_summary">
            NDA前に共有できる要約
          </label>
          <textarea
            id="nda_pre_disclosure_summary"
            name="nda_pre_disclosure_summary"
            rows={3}
            placeholder="NDA前に共有可能な要約情報を記載してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold" htmlFor="confidential_detail_notes">
            機密詳細（内部用）
          </label>
          <textarea
            id="confidential_detail_notes"
            name="confidential_detail_notes"
            rows={3}
            placeholder="提出前に内部で扱うべき機密の詳細を入力してください。"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2">
            <input name="accepted_terms" type="checkbox" value="true" />
            以上の内容が事実に基づき、同意済みです。
          </label>
          <p className="text-sm text-slate-600">未同意の場合は提出できません。</p>
        </div>

        {errorMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p> : null}

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          投稿前チェックして提出する
        </button>
      </form>

      <Link href={`/inventor/inventions/${invention.id}`} className="inline-block text-sm text-blue-700 hover:underline">
        発明詳細へ戻る
      </Link>
    </div>
  );
}
