# inventor draft edit MVP

## 目的
発明者がログイン済みで、自分の `draft` 状態の発明下書きを編集できる最小機能を実装します。

## 実装範囲（今回実施）
- `/inventor/inventions/[id]`
  - 自分の下書き詳細を表示
  - 作成済み下書きへの「編集」リンクを追加
- `/inventor/inventions/[id]/edit`
  - 自分の下書きの編集フォーム
  - タイトルを含む既存項目の再入力（最小項目）
  - 保存時に `update` を実行
- `app/inventor/inventions/actions.ts`
  - `updateDraftAction` を追加
  - 未ログイン時は `/login` へ誘導
  - `id / inventor_id / status / deleted_at` 条件で更新

## 実装されていない範囲
- submit（投稿確定）
- 投稿前チェック
- ファイルアップロード
- 企業向け開示表示
- signed URL 発行
- 運営/企業/partner向けの高度権限制御UI

## 更新条件（RLS方針）
- 編集可能条件: `inventor_id = auth.uid()`, `status = 'draft'`, `deleted_at is null`
- 対象は自分の下書きのみ
- 他ユーザー案件・ドラフト以外は編集できない（取得条件でガード）

## セキュリティ方針
- サーバー Action は `supabase.auth.getUser()` で本人確認
- `service_role` キーは使用しない
- `inventions` 取得は自分の `inventor_id` を条件に限定
- 会社向けに `inventions`/`invention_files` を直接取得する実装はまだ入れない

## 追加した主な振る舞い
- 404 相当の扱いで、他人のdraftや存在しないIDの編集ページは開けない
- `title` は必須
- 更新成功後、該当下書き詳細に戻る
- 失敗時は簡易エラーメッセージを表示

## 次フェーズ
- submit フロー
- 投稿前チェック保存
- 先行技術調査前提項目の追加
- 画像・図面などファイル関連機能
