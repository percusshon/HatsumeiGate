# RLS検証シナリオ（実装前設計）

## 1. 検証の目的

Hatsumei GateのRLS実装が以下を満たすことを検証する。

- 発明者は自案件のみ閲覧・更新できる
- Internal（operator/reviewer/admin）は必要最小の範囲を閲覧できる
- 企業ユーザーはNDA前提・開示レベル・所属制約を満たす案件のみ閲覧
- patent_attorney_partnerは割り当て案件のみに絞って閲覧
- 企業向け直接開示が危険なテーブル（`inventions`, `invention_files`, `audit_logs`, `revenue_events`）を直読しない
- 重要操作（NDA同意、開示承認、閲覧ログ記録）と整合しないSELECTを防止

## 2. テスト対象ロール

- anonymous
- authenticated without profile（認証済みだが `users_profile` 未作成）
- inventor_a
- inventor_b
- operator
- reviewer
- admin
- company_user
- company_admin
- company_legal_reviewer
- patent_attorney_partner

## 3. テスト前提データ（最小フィクスチャ）

下記を前提にシナリオを組む。

- `invention_a`: `inventor_a`所有
- `invention_b`: `inventor_b`所有
- `company_account_a`: NDA有効（承認済）で開示を進める会社
- `company_account_b`: NDA未承認または有効期限切れ
- `company_disclosure_requests`:
  - approved（`invention_a` ↔ `company_account_a`）
  - rejected（`invention_b` ↔ `company_account_b`）
- `partner_assignment_active`: `patent_attorney_partner` に `invention_a` を割当
- `partner_assignment_revoked`: 同パートナーの `invention_b` への無効化割当

## 4. allow シナリオ

### 4.1 匿名/未プロフィール
- anonymous: 全appテーブルに対して不可（`SELECT`/`INSERT`/`UPDATE`/`DELETE` すべて deny）
- authenticated without profile: 全appテーブルに対して不可

### 4.2 inventor
- inventor_a:
  - `inventions`: 自作品のみ `SELECT`/`UPDATE( draft )`/`INSERT`
  - `invention_submission_checks`: 自作品のみ `SELECT/INSERT/UPDATE`（未確定案件含む）
  - `invention_status_events`: 自案件の閲覧許可条件（`visible_to_inventor` 系）
  - `company_disclosure_requests` etc: 運営/会社側のものへの参照は原則不可
- inventor_b:
  - inventor_b版同等

### 4.3 internal
- operator:
  - `inventions`, `invention_files`, `invention_submission_checks`: 運営閲覧範囲（実データ）
  - `invention_screening_reports`, `invention_screening_scores`, `prior_art_items`, `ip_strategy_notes`: 運営用参照可
  - `invention_status_events`: insert/update（運営対象）
- reviewer:
  - inventor/運営が扱う一覧の `SELECT` を中心に確認
- admin:
  - 上記internal操作に加え、運営権限範囲の補助確認（監査/収益はpolicy設計上admin主導）

### 4.4 企業
- company_user/company_admin/company_legal_reviewer:
  - 自社情報（`company_accounts`, `company_members`, `nda_acceptances`, `company_disclosure_requests`, `company_invention_views`, `deal_pipeline` の自社分）は `SELECT`
  - `company_disclosure_requests` 申請側として自身会社起点での登録を確認
- company_adminのみ:
  - `company_account` の更新方針を確認（本設計では `company_accounts` 直接UPDATEは未許可、API経由運用を想定）

### 4.5 partner
- patent_attorney_partner:
  - `partner_invention_assignments`: 自分の有効割当のみ `SELECT`
  - `invention*` 系（`inventions`, `invention_files`, `invention_submission_checks`, `invention_screening_reports`, `invention_screening_scores`, `prior_art_items`, `ip_strategy_notes`）は割当発明のみ参照

## 5. deny シナリオ（重要）

1. `inventor_a` cannot read `invention_b`
2. `company_user` cannot directly `SELECT` `inventions`
3. `company_user` cannot directly `SELECT` `invention_files`
4. `company_user` cannot `SELECT` `audit_logs`
5. `company_user` cannot `SELECT` `revenue_events`
6. `patent_attorney_partner` cannot read unassigned inventions
7. `patent_attorney_partner` cannot `SELECT` `deal_pipeline`
8. `patent_attorney_partner` cannot `SELECT` `audit_logs`
9. anonymous cannot read app tables
10. `authenticated without profile` cannot pass `has_app_role` の判定により internal/company/partner権限を得る
11. partnerの `revoked` 割当先は見えない
12. `company_account_b` がNDA未成立の前提では機密開示テーブルは取得不可

## 6. 検証順序（推奨）

1. プロファイル未作成/未認証のdeny確認
2. inventor本人読取（read own / read other）
3. internalロールのread + operatorの書き込み（`invention_status_events`）
4. companyロールの所属・NDA・開示制限のread制御
5. partnerの割当制御（有効/無効）
6. 高リスクテーブルのdeny検証（`audit_logs`,`revenue_events`,`deal_pipeline`,`invention_files`）
7. 失敗した場合は事象別（認証, policy, API条件）に分解して再現

## 7. 失敗時の切り分け

- **認証/ロール条件不一致**
  - `auth.uid()` が想定ユーザーか、`user_app_roles` が付与済みかを確認
- **policy定義不整合**
  - `CREATE POLICY` の対象テーブルと `WITH CHECK / USING` の役割を照合
- **NDA/開示条件未満**
  - `company_innovation` 側リクエストの状態と `deleted_at is null` 条件、承認フローを確認
- **ファイル関連リーク**
  - `invention_files` metadataのみ公開条件、storageのsigned URL発行をAPI前提であることを確認
- **partner割当条件不一致**
  - `partner_invention_assignments` の `revoked_at` や `partner_user_id` を確認

## 8. 未決事項

- 企業向け `inventions` 参照を完全にAPI DTOへ寄せる方針は現状維持。将来、最小フィールドAPI化に向けた再設計の有無を検討
- `invention_status_events` のpartner閲覧可否は運用的に今後見直し余地あり（API要約化を前提）
- `company` 側のファイル/attachment 付随参照は、Storage signed URL経路の実装後に追加シナリオ化