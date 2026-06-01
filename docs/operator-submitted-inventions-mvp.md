# Operator submitted inventions MVP

## 実装範囲

本実装は `submitted` 状態の発明案件を、operator 向けに「一覧」と「詳細」で確認する最小MVPです。

- `/operator`：運営ダッシュボードに提出済み案件一覧への導線を追加
- `/operator/inventions`：`inventions` の `status = 'submitted'` をRLS越しに一覧表示
- `/operator/inventions/[id]`：提出案件の詳細を表示（主要項目 + 投稿前チェック + 状態イベントの最小表示）

## 未実装範囲

- 審査レポート作成（`invention_screening_reports` 等）
- ステータス更新（`invention_status_events` への編集・遷移操作）
- 企業開示申請作成・運営承認UI
- ファイルアップロード
- signed URL発行

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 読み取りは対象テーブルの `SELECT` のみで、RLS を前提に実行します。
- 会社向けに `inventions` / `invention_files` の直接取得は追加していません。
- 社内向け情報は最小項目表示にとどめています。

## 画面の前提

- Operator / Reviewer / Admin 権限は既存 `user_app_roles` とRLSで判断し、今回の実装では表示制御は主にRLSに委ねます。
- 取得できない案件は「見つかりません」側に倒し、`submitted` 以外の案件や他ユーザー案件は通常見えません。
- `company` 側の直接詳細閲覧は引き続き未実装として扱います。

## 確認ポイント

- `submitted` のみ表示されること
- 他画面で `submitted` 案件一覧を広く露出しないこと
- `invention_submission_checks` の表示は閲覧のみ（編集・更新なし）
- 禁止表現（特許取得保証、企業売却保証、収益保証、法的代理関係表現）を追加しない
