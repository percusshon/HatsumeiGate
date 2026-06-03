# Hatsumei Gate / 発明ゲート

## サービス情報

- サービス名: Hatsumei Gate
- 日本語表記: 発明ゲート
- リポジトリ名: hatsumei-gate
- ローカル作業フォルダ: `/Users/percusshon/Documents/Codex/2026-05-27/hatsumei-gate`
- タグライン: 個人の発明を、知財と企業提案へつなぐ。

## サービス概要

Hatsumei Gateは、個人・現場職・クリエイター・エンジニアが思いついた発明アイデアを秘密保持付きで投稿し、運営が次を支援するサービスです。

- 一次診断
- 先行技術調査メモ
- 知財方針整理
- 試作検討
- 弁理士相談準備
- 企業提案
- 譲渡 / ライセンス / 共同開発の交渉管理

単なるアイデア投稿サイトではなく、**発明整理・知財化・企業提案支援**を目的とします。

## 現在のプロジェクト状態

- 業務ロジック docs を source of truth として実装進行中
- Next.js (App Router) + Supabase 導入済み
- 実装済み: Supabase スキーマ/RLS/storage/seed、Magic Link 認証、inventor 下書き〜提出、発明者の進捗可視・開示同意・取り下げ、operator 内部審査（フルライフサイクルのステータス遷移 / 審査レポート / 先行技術 / 知財方針）、operator 企業審査・開示申請レビュー・取引パイプライン、企業ポータル（NDA同意・失効 / 開示申請作成 / 企業主導の deal 遷移）、企業向けティザー一覧（discovery）、企業向けゲート付き開示ビュー（service_role API + 閲覧ログ + 監査ログ）、開示ファイル配信（NDA/レベル連動・**表示時透かし**・回数制限）、収益イベント記録、弁理士パートナー閲覧、アプリ内通知
- 開示の happy path が一周: 企業申請 → 発明者同意 → 運営承認（NDA/レベルゲート）→ ゲート付き開示閲覧/透かし付きファイル配信（ログ）→ 取引管理 → 収益記録
- 検証基盤: ユニットテスト（vitest）と CI（GitHub Actions: Lint & Build / Unit tests / RLS・RPC smoke）
- 残（コード外・本番運用系）: 本番 Supabase/Vercel 接続・監視・バックアップ、法務文言の最終確定、ウイルススキャン（スキャナ選定）。詳細は `docs/implementation-roadmap.md` と各 `docs/*-mvp.md` 参照

## 重要方針

- 非公開・審査制・招待制の企業閲覧
- NDA前/後で開示情報を分離して管理
- 投稿情報は原則として秘密情報として扱う
- 運営は弁理士業務（特許庁手続の代理）を行わない
- 「特許取得保証」「企業売却保証」「収益化保証」の断定は禁止
- OtoMarketの販売マーケット的文脈をそのまま持ち込まない

## 参照ドキュメント

- [docs/hatsumei-gate-business-logic.md](docs/hatsumei-gate-business-logic.md)
- [docs/invention-status-workflow.md](docs/invention-status-workflow.md)
- [docs/invention-submission-checklist.md](docs/invention-submission-checklist.md)
- [docs/invention-screening-logic.md](docs/invention-screening-logic.md)
- [docs/ip-strategy-decision-tree.md](docs/ip-strategy-decision-tree.md)
- [docs/company-disclosure-workflow.md](docs/company-disclosure-workflow.md)
- [docs/deal-pipeline-workflow.md](docs/deal-pipeline-workflow.md)
- [docs/repository-and-project-setup.md](docs/repository-and-project-setup.md)
- [docs/storage-policy-plan.md](docs/storage-policy-plan.md)
- [docs/operations-and-deployment.md](docs/operations-and-deployment.md)
- [docs/otomarket-reuse-notes.md](docs/otomarket-reuse-notes.md)

## 開示ファイルの透かし

NDA 成立（level_2 以上）後に企業へ配信する画像・PDF は、配信の都度サーバー側で
「社名・閲覧者ID・閲覧日時(JST)」の透かしを焼き込んで inline 配信します。
生のストレージ署名 URL はクライアントへ渡さず、必ず透かしを通します。

- 実装: `lib/storage/watermark.ts`（画像= `sharp`、PDF= `pdf-lib` + `@pdf-lib/fontkit`）
- 日本語社名描画のため Noto Sans JP を同梱（`assets/fonts/`、OFL ライセンス同梱）。
  本番バンドルへは `next.config.mjs` の `outputFileTracingIncludes` で含めます。
- 配信ルート: `app/company/inventions/[id]/files/[fileId]/route.ts`
  （ゲート再検証 → 閲覧/監査ログ → 透かし → 配信。回数制限・期限失効も適用）

## 開発・検証

```bash
npm install        # 依存導入（sharp 等のネイティブモジュールを含む）
npm run dev        # 開発サーバー
npm run lint       # ESLint
npm run build      # 本番ビルド（型チェック相当）
npm test           # ユニットテスト（vitest）
```

- 環境変数: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`、
  サーバー専用の `SUPABASE_SERVICE_ROLE_KEY`（開示API・監査・ファイル配信で使用、`.env.local` のみ）。
- ローカル Supabase は `supabase start` / `supabase db reset`（CLI + Docker）。
  RLS の実機検証は `docker exec -i supabase_db_hatsumei-gate psql -U postgres` で可能。

## 検証コマンド

- `git status --short`
- `git diff --check`
- `npm run lint` / `npm run build` / `npm test`

## コミット方針

- 変更内容を確認したうえでコミットする
- コミット前に必ず `git diff --check` を実行する
- 変更内容の監査性を保つため、検証結果を毎回確認する
