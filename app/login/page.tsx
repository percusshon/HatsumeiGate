import { sendMagicLink } from './actions';

type SearchParams = {
  sent?: string | string[];
  error?: string | string[];
};

export default function LoginPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const sent = typeof searchParams?.sent === 'string' ? searchParams.sent : null;
  const error = typeof searchParams?.error === 'string' ? searchParams.error : null;
  const message =
    sent === '1'
      ? 'ログイン用メールを送信しました。受信トレイのMagic Linkからログインしてください。'
      : error === 'invalid_email'
        ? '有効なメールアドレスを入力してください。'
        : error === 'send_failed'
          ? 'メール送信処理に失敗しました。しばらくして再試行してください。'
          : error
            ? '認証処理で問題が発生しました。'
            : '';

  const statusClass = error ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Login</h2>
      <p className="text-slate-700">
        Supabase Magic Link（メール認証）でログインします。ユーザーアカウント作成と同時に公開キー（ANON）での接続を前提にした最小実装です。
      </p>
      <form action={sendMagicLink} className="space-y-3">
        <label htmlFor="email" className="block text-sm font-semibold">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700" type="submit">
          Magic Linkを送信
        </button>
      </form>
      {message && (
        <p className={`rounded-md border p-3 text-sm ${statusClass}`}>
          {message}
        </p>
      )}
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        本システムは公開情報のみに依存せず、RLS越しの本人範囲を前提にします。会社向けの発明詳細表示は次フェーズで追加します。
      </p>
    </div>
  );
}
