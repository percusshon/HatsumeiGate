# Hatsumei Gate App Scaffold

## 追加内容

- Next.js App Router（TypeScript）を最小構成で追加
- Tailwind CSS を導入
- Supabase SSR クライアントヘルパーを追加
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
- 認証補助ヘルパー追加
  - `lib/auth/get-current-user.ts`
- ルートページ追加
  - `/`
  - `/login`
  - `/inventor`
  - `/operator`
  - `/company`
  - `/partner`
  - `/admin`
  - `/privacy`
  - `/legal`

## 方針

- 本scaffoldはプレースホルダー中心で実機能を持たない。
- `inventions` / `invention_files` の企業向け直接取得画面は未実装。
- `service_role` キーは使用しない。
- RLSの安全確認は既存のDB側ポリシーと既存テストで担保。

## 既存資産との影響

- migration / seed / RLS test の既存ファイルは変更しない。
- フロント側は最小表示と安全な接続先定義まで。
