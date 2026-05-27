# Supabase Schema Implementation Plan

> SQLは未作成。まず実装順・制約方針の文書化を行う。

## 1. 方針

- MVPは「非公開・審査制・秘密情報保護」を満たす最短構成。
- nullable として開始し、運用検証後に NOT NULL/強制制約を追加。
- 監査性を優先し、可能な限り変更履歴はイベントテーブルを主軸に記録。
- 外部キーは必要最小で定義し、循環依存を回避。

## 2. Enum一覧

- `role`
- `invention_status`
- `disclosure_level`
- `deal_status`
- `ip_strategy`
- `file_scope`
- `event_action`

### 将来拡張候補

- `nda_state`
- `request_status`
- `deal_type`
- `disclosure_scope_reason`

## 3. Extension候補

- `pgcrypto`: UUID
- `uuid-ossp`: 既存準拠互換（必要時）
- `pg_trgm`: 模糊検索（将来の類似特許・案件検索）
- `citext`: メールなど大小文字非依存検索（将来）

## 4. テーブル実装順・依存・制約方針

### 4.1 users_profile

- 依存: `organizations`, `role`
- 目的: 発明者/運営/管理者のベース。
- 最初はnullable: `organization_id` は将来統合まで許容。
- 制約方針: MVPは email/phone 正規化のみ、厳格フォーマットは後回し。
- 監査: `created_by / updated_by` 追加を推奨（現時点は `created_at/updated_at` 重点）。

### 4.2 organizations

- 依存: なし（基底）
- 目的: 社内運用・所属情報。
- 最初は nullable: `slug`, `type`。
- 制約: unique 名称は本番準備後。

### 4.3 organization_members

- 依存: `organizations`, `users_profile`
- 目的: 所属管理。
- 制約: 一人多属は許容（MVPでは unique 制約は後回し）。

### 4.4 inventions

- 依存: `users_profile`, `organizations`
- 目的: 発明案件の主軸。
- 最初は nullable: `organization_id`。
- 制約: status 初期値 `draft`, `status_reason` は nullable。

### 4.5 invention_submission_checks

- 依存: `inventions`
- 目的: 投稿前チェック。
- 制約: 1発明あたり1最新行想定。将来 unique `(invention_id, created_at)` は緩い設計で開始。

### 4.6 invention_status_events

- 依存: `inventions`, `users_profile`
- 目的: ステータス履歴。
- 制約: 最低限 from/to と actor を保存。

### 4.7 invention_files

- 依存: `inventions`, `users_profile`
- 目的: 秘密資料。
- 最初は nullable: `file_hash`
- 制約: scopeの enum と storage_path は必須寄りに固定。

### 4.8 invention_screening_reports

- 依存: `inventions`, `users_profile`
- 目的: 一次診断結果。
- 制約: `decision` を `A~E` 固定化は未定義なら text 運用。

### 4.9 invention_screening_scores

- 依存: `invention_screening_reports`
- 目的: 7軸スコア。
- 制約: 0–5 の range は DB CHECK ではなく API 検証 + 後で付与。

### 4.10 prior_art_items

- 依存: `invention_screening_reports`
- 目的: 先行技術メモ。
- 制約: source_ref は text nullable。重複除外は unique は後回し。

### 4.11 ip_strategy_notes

- 依存: `inventions`, `users_profile`
- 目的: 知財方針の暫定整理。
- 制約: strategy を enum で固定可。

### 4.12 company_accounts

- 依存: なし
- 目的: 企業アカウントの運用単位。
- 制約: ドメイン名/業界分類は任意項目として開始。

### 4.13 company_members

- 依存: `company_accounts`, `users_profile`
- 目的: 企業内ユーザーとロール紐づけ。
- 制約: admin数上限は後回し。

### 4.14 nda_acceptances

- 依存: `inventions`, `company_accounts`, `company_disclosure_requests`（任意）, `users_profile`
- 目的: NDA同意。
- 制約: `expires_at` nullable、承認履歴は複数可能。

### 4.15 company_disclosure_requests

- 依存: `inventions`, `company_accounts`, `users_profile`
- 目的: 開示リクエストの起点。
- 制約: `target_level` と `status` は必須。

### 4.16 company_invention_views

- 依存: `inventions`, `company_accounts`, `users_profile`, `company_disclosure_requests`
- 目的: 閲覧ログ。
- 制約: company_id + invention_id + viewed_at のユニーク制約は運用後に付与。

### 4.17 deal_pipeline

- 依存: `inventions`, `company_accounts`, `company_disclosure_requests`, `users_profile`
- 目的: 交渉管理。
- 制約: `status` に初期値。
- 補足: `disclosure_request_id` は nullable（開示後の流入）

### 4.18 deal_status_events

- 依存: `deal_pipeline`
- 目的: 交渉履歴。
- 制約: from/to は event 時点で必須。

### 4.19 revenue_events

- 依存: `deal_pipeline`, `inventions`, `company_accounts`
- 目的: 成果報酬/成功報酬イベント。
- 制約: 金額項目はMVPでは numeric/通貨を柔軟型で保存。

### 4.20 audit_logs

- 依存: `users_profile`, `inventions`, `company_accounts`, `deal_pipeline`
- 目的: 全主要操作の監査。
- 制約: 機密情報の本文保持を避けるため本文列は最小化。

## 5. 監査ログ接続

- 全status更新、view/download、NDA関連、取引更新は必ず `audit_logs` へイベント化。
- `request_id`/`actor_role`/`event_action` を共通必須メタとして持つ。
- `related_invention_id` と `disclosure_level` を付与し、後から開示範囲検証できる形にする。

## 6. MVPで入れる制約 / 後回しにする制約

### MVPで入れる
- PK/FK/基本非null、created_at/updated_at、soft delete。
- 削除禁止の重要ステータステーブル（`inventions`）は削除保護。
- 一覧検索のため最低インデックス（status, created_at）。

### 後回しにする
- 厳密なメール正規化、権限の複合ユニーク、金額監査のFK完結。
- 先行技術URL重複排除、取引条件条文のJSON schema strict。
- 競合制限の高度な整合性チェック（DB制約ではなくアプリケーション側）。
