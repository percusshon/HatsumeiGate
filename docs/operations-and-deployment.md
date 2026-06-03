# 運用・デプロイ メモ

実装・検証・本番運用の手順をまとめる作業メモ。確定運用は本番化フェーズで正式化する。

## 1. 環境変数

| 変数 | 用途 | 配置 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL（クライアント可） | ビルド/実行 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | ビルド/実行 |
| `SUPABASE_SERVICE_ROLE_KEY` | 開示API・監査・ファイル配信のサーバー専用権限 | `.env.local` のみ（gitignore、クライアント非公開） |

- 新 Supabase CLI は publishable key を発行する。`.env.local` の anon key 欄に publishable key を設定する。
- service_role は **サーバー専用**。クライアントに渡さない。利用箇所は開示API・`lib/audit/log.ts`・ファイル配信ルート。

## 2. ローカル開発

```bash
npm install
supabase start          # ローカルスタック（Docker）
supabase db reset       # migration + seed 適用
npm run dev
```

- RLS 実機検証: `docker exec -i supabase_db_hatsumei-gate psql -U postgres`
  （`set local role authenticated` + `set local request.jwt.claims` でロール模擬）。
- seed のテスト UUID: operator=`333...` / inventor_a=`111...` / company_user=`666...` / company A=`aaaa...`。

## 3. CI（GitHub Actions / `.github/workflows/ci.yml`）

- **Lint & Build**: `npm run lint` → `npm run build`（ダミー env）。
- **Unit tests**: `npm test`（vitest）。
- **RLS / RPC smoke**: `supabase start` → `supabase db reset` → `supabase/tests/rls_smoke.sql` を psql で実行。
- 同一 ref の旧実行は concurrency で自動キャンセル。

## 4. デプロイ（Vercel + Supabase 想定）

- 本番 Supabase プロジェクトへ migration を適用（`supabase db push` 等）。
- Vercel に上記 env を設定（`SUPABASE_SERVICE_ROLE_KEY` は Production スコープのサーバー env）。
- **透かしフォントのバンドル**: `next.config.mjs` の `experimental.outputFileTracingIncludes` で
  `assets/fonts/**` をファイル配信ルートに含めている。デプロイ後、企業ファイル閲覧で
  日本語社名の透かしが表示されることを実機確認する（フォント未バンドルだと透かしが豆腐化/失敗する）。

## 5. 開示ファイルの透かし（要点）

- level_2 以上で企業へ配信する画像・PDF に、配信の都度「社名・閲覧者ID・閲覧日時(JST)」を焼き込む。
- 生のストレージ署名 URL はクライアントへ渡さず、必ずサーバーで透かしを通して inline 配信する。
- 回数制限（日次/ユーザー20・月次/ユーザー200・日次/案件60）と期限失効（`expires_at`）を配信ゲートで適用。
- 実装: `lib/storage/watermark.ts` / `app/company/inventions/[id]/files/[fileId]/route.ts`。

## 6. 手動検証チェックリスト（認証付き・本番相当）

- [ ] 企業ユーザーで NDA 成立 + 開示承認済みのファイルを閲覧 → 透かし（日本語社名）が表示される。
- [ ] 承認のない発明のファイル URL → `?error=file_forbidden` で詳細へ戻る。
- [ ] 承認の `expires_at` を過去にする → `?error=file_expired`。
- [ ] 上限到達 → `?error=file_download_limit`。
- [ ] PDF を閲覧 → 各ページに透かしが入る（pdftoppm 等での目視）。

## 7. 本番運用で別途必要（コード外・要決定/人手）

- 本番 Supabase/Vercel 接続、監視（エラー/レイテンシ）、バックアップ方針。
- 法務文言（利用規約 `/legal` / プライバシー `/privacy`）の最終確定（現状は暫定ドラフト）。
- **ウイルススキャン**（`docs/storage-policy-plan.md` §10）: アップロード時の非同期スキャン。
  スキャナ選定（例: ClamAV / クラウドスキャンAPI）と `invention_files` への
  スキャン状態列（migration）追加が必要なため、方式決定後に着手する。
