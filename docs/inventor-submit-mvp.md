# Inventor submission MVP (draft -> submitted)

## 目的
ログイン済みの発明者が、自分の `draft` を投稿前チェックとして自己確認し、`submitted` へ進める最小機能を実装します。

## 実装範囲（今回実施）
- `/inventor/inventions/[id]`
  - 自分の対象発明詳細を表示
  - `status` が `draft` の場合のみ「投稿前チェックへ進む」リンクを表示
  - `submitted` になった場合は安全な状態表示を出す

- `/inventor/inventions/[id]/submit`
  - 自分の `draft` のみを対象に、投稿前チェック入力フォームを表示
  - `accepted_terms` が未同意だと提出不可
  - `is_original_inventor` が未チェックだと提出不可（安全側のバリデーション）

- `app/inventor/inventions/actions.ts`
  - `submitDraftAction` を追加
  - `auth.uid` の本人確認後、対象が自分の `draft` であることを確認
  - `invention_submission_checks` へ保存
  - `inventions` を `draft` -> `submitted` に更新し `submitted_at` を設定
  - `invention_status_events` に `draft` -> `submitted` を記録
  - 成功時は詳細画面へ戻る

- `/inventor`（軽微更新）
  - `draft` と `submitted` を分けて表示

- `docs/inventor-submit-mvp.md`
  - 実装範囲・未実装範囲・RLS前提を明記

## 実装しない範囲
- ファイルアップロード
- 企業向け開示画面
- signed URL 発行
- operator / reviewer / admin 向け審査UI
- 最終的な審査・交渉フロー

## セキュリティ・RLS前提
- `service_role` は使用しない。
- `createServerSupabaseClient` + `getUser` で本人確認。
- `invention_submission_checks` は自分の発明のみ対象。
- `submit` は `id`, `inventor_id`, `status = draft`, `deleted_at is null` を満たす場合のみ進める。
- 会社向け `inventions` / `invention_files` の直接取得実装はまだ追加しない。

## 重要な確認
- 投稿前チェックはリスク整理・確認であり、`必ず特許が取れる` などの保証を意味しない。
- `NDA前に詳細を企業へ公開する` 挙動は意図的に追加しない。

## 未実装/未確定
- 本番運用に必要な状態更新のRLS許可（`inventions` の draft -> submitted 更新、`invention_status_events` insert）が不足している可能性がある。
- RLS不足が発生した場合は service_role を使わず、次タスクで最小のRLS追加方針を切り分ける。
