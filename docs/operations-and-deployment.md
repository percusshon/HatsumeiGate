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
- **ウイルススキャン**（`docs/storage-policy-plan.md` §10 / 詳細は `docs/virus-scan-proposal.md`）:
  アップロード時の非同期スキャン。スキャナ選定（ClamAV 自前 / クラウドAPI / Edge）と
  `invention_files` へのスキャン状態列（migration 0029 想定）追加が必要。
  秘密保持の観点で外部送信型APIは要法務確認。方式決定後に別タスクで着手する。

## 8. 本番デプロイ手順書（ユーザー作業）

コード側は本番化準備が完了している。以下は **アカウント作成・課金・秘密鍵の保持・ダッシュボード操作・ドメイン設定** を伴うため、ユーザー自身が実施する。各ステップの「担当」を明記する。

> **最重要**: 本番への適用は `supabase db push`（migration のみ）を使う。
> `supabase db reset` は **使わない**（`supabase/seed.sql` のテスト専用データが本番に入るため）。
> ストレージのバケット（`invention-files` / `company-disclosure-files` / `legal-documents` /
> `public-assets`）と RLS は migration `0011` 等で自動作成されるので、手動作成は不要。

### 8.1 Supabase 本番プロジェクト（担当: ユーザー）

1. supabase.com で本番プロジェクトを作成。リージョンは東京 `ap-northeast-1` 推奨。DB パスワードは強固に設定し安全に保管する。
2. CLI で本番へリンクし、スキーマを適用する:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push          # migration を適用（buckets / RLS / RPC を作成）
   ```
   - `db reset` は禁止（テスト seed が入る）。本番は `db push` のみ。
3. ダッシュボード Authentication で **Site URL** と **Redirect URLs** を Vercel 本番ドメインに設定（Magic Link の戻り先）。
4. **本番メール送信（SMTP）** を設定。Supabase 内蔵メールは検証用で送信制限があり本番不可。外部プロバイダ（SendGrid / Resend / Amazon SES 等）の SMTP を Auth に登録する。
5. キーを控える: `Project URL` / `anon (publishable) key` / `service_role key`。

### 8.2 Vercel デプロイ（担当: ユーザー）

1. Vercel に GitHub `percusshon/HatsumeiGate` を Import（Framework: Next.js は自動検出）。
2. Environment Variables（Production スコープ）を設定:

   | 変数 | 値 | 注意 |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | 本番 Project URL | クライアント可 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key | クライアント可 |
   | `NEXT_PUBLIC_SITE_URL` | 本番ドメイン | クライアント可 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **サーバー専用**。`NEXT_PUBLIC_` を付けない／クライアントに出さない |

3. デプロイ後に実機確認（§6 のチェックリストも併用）:
   - 企業ユーザーでファイル閲覧 → **日本語社名の透かしが表示される**（フォントが本番バンドルに含まれているか＝`outputFileTracingIncludes` の動作確認）。豆腐化したらフォント未バンドル。
   - Magic Link でログインできる（SMTP / Redirect URL が正しいか）。
4. 独自ドメインを使う場合は Vercel で割当て、Supabase の Site URL / Redirect URL も同じドメインへ更新する。

### 8.3 監視（担当: ユーザー、コード組込は要相談）

- **Supabase**: Dashboard の Logs（API / DB / Auth）。Pro 以上で Reports / Advisors により RLS 等の警告を検知できる。デプロイ後に一度 Advisors を確認する。
- **Vercel**: Observability / Logs を有効化。エラー追跡（Sentry 等）を入れる場合はコード側の組込が必要（依存追加は要承認）。
- **外形監視**: トップページ＋ログイン導線を Better Uptime / UptimeRobot 等で定期チェック。

### 8.4 バックアップ（担当: ユーザー）

- **Supabase DB**: プラン選択が要点。Free はバックアップが限定的、**Pro 以上で日次バックアップ＋PITR（7日）**。本番は Pro 以上を推奨。
- **復元テスト**: 設定後に一度リストアを実施し、手順と所要時間を確認する。
- **ストレージ（バケット内ファイル）**: DB バックアップとは別管理。重要ファイルのエクスポート/二重化方針を運用判断で決める。

### 8.5 コード側で対応可能（担当: Claude、要依頼）

- Sentry 等のエラーモニタリング組込（依存追加は要承認）。
- デプロイ前後の疎通チェック手順・RLS Advisors 確認手順の整備。
- `.env.example` と本番 env 対応表の整合チェック。
