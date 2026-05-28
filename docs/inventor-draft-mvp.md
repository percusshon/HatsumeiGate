# Inventor draft MVP

## 実装範囲

- `/inventor` でログイン中ユーザーの本人プロフィールと、RLS越しの自分の `draft` のみを一覧表示
- `/inventor/inventions/new` で最小項目の下書き作成フォーム
- `/inventor/inventions/[id]` で自分の draft 詳細表示

## 実装外（次フェーズ）

- submit（`/inventor/inventions/[id]` の提出フロー）
- 投稿前チェック（`invention_submission_checks`）
- ファイルアップロード
- signed URL発行
- 企業向けの `inventions` / `invention_files` 直接取得実装
- ステータス更新権限・審査フローの運用実装

## 仕様

- サーバーアクション: `app/inventor/inventions/actions.ts`
  - `createDraftAction`
  - `auth.getUser()` で本人確認
  - 未ログインなら `/login`
  - `title` は必須バリデーション
  - `inventions` へ insert
    - `inventor_id`, `created_by`, `updated_by` は auth ユーザーID
    - `status = draft`
    - `visibility_level = internal`
    - `current_disclosure_level = level_0_internal_only`
- `/inventor` では `inventor_id = auth.uid()` 相当として現在ユーザーIDで絞り込み、RLSにより他人案件を読めない前提
- `/inventor/inventions/[id]` は対象IDの下書きのみ表示し、存在しない/権限なしは安全なNot Found表示

## セキュリティ前提

- service_role key は未使用（`NEXT_PUBLIC_SUPABASE_ANON_KEY` のみ）
- RLSを前提にした読み取りのみ
- 企業側への発明詳細の直接表示は未実装
