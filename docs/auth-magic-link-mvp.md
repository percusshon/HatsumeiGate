# Magic Link認証MVP設計

## 実装範囲（今回）

- `/login` でメールアドレスを受け取り、`signInWithOtp` を実行してMagic Linkを送信する。
- `/auth/callback` で `code` を受け取り、`exchangeCodeForSession` を実行してセッションを確立する。
- `/logout` で `signOut` を実行し、トップへ戻す。
- `lib/auth/get-current-user.ts` で `supabase.auth.getUser()` と `users_profile` の自己行をRLS越しに読み取り、本人確認表示に利用する。
- `/inventor` でログイン状態と自己プロフィール読み取り結果を表示する。

## 制約

- service_roleキーは未使用。`NEXT_PUBLIC_SUPABASE_ANON_KEY` だけを使用する。
- 企業向け `inventions` / `invention_files` の直接取得実装は行わない。
- 発明投稿フォーム、ファイルアップロード、signed URL、APIルート本格実装は次フェーズ。
- RLS/権限ルールを迂回する実装はしない。
- 特許取得保証・企業売却保証・収益化保証を示唆する表現は入れない。

## 追加ファイル

- `app/login/page.tsx`
- `app/login/actions.ts`
- `app/auth/callback/page.tsx`
- `app/logout/route.ts`
- `app/inventor/page.tsx`
- `lib/auth/get-current-user.ts`
- `.env.example`（`NEXT_PUBLIC_SITE_URL` 追加）

## 仕様メモ

- 送信成功/失敗は、`/login?sent=1` や `?error=...` でメッセージ表示。
- callback 成否に応じて `/inventor` または `/login?error=callback` に遷移。
- `get-current-user` は本人のプロフィールを `users_profile` からのみ読む。
- `user_app_roles` は存在する場合に限り `roles` として補助取得する（RLS環境依存で無視可）。
