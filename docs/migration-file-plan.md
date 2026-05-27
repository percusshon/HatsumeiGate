# Migration File Plan

## 1. 目的

Supabase実装前に、migrationを小さな単位で分割し、ロール/権限/RLS/secret制御の順番で破綻なく導入するための計画を固定する。

## 2. 分割方針

- 1ファイル=1テーマで原則分ける。
- 1コミット=1〜2ファイルを上限とし、ロールバックしやすくする。
- テーブル追加とRLS有効化は同一ファイル内で過不足を分ける（RLSは段階的）。
- seedは本体スキーマ確定後に別ファイル。
- SQLは未作成のためここでは「何を入れるか」の計画のみ作成する。

## 3. migration prefix 命名規則

- 形式: `NNNN_<category>_<short_name>.sql`
- NNNN: 実行順を固定する4桁。
- category: `extensions`, `schema`, `rls`, `storage`, `seed`, `bootstrap` 等。
- 同日追加時の順序衝突を避けるため、将来差分は末尾番号を上げる。

例: `0001_extensions_and_enums.sql`

## 4. 推奨ファイル順序（初回MVP前提）

1) `0001_extensions_and_enums.sql`
2) `0002_profiles_and_organizations.sql`
3) `0003_inventions_core.sql`
4) `0004_invention_submission_and_status.sql`
5) `0005_screening_and_ip_strategy.sql`
6) `0006_company_accounts_and_members.sql`
7) `0007_nda_and_disclosure.sql`
8) `0008_deal_pipeline.sql`
9) `0009_revenue_events.sql`
10) `0010_audit_logs.sql`
11) `0011_storage_buckets_and_policies.sql`
12) `0012_rls_enablement.sql`
13) `0013_rls_policies_inventor.sql`
14) `0014_rls_policies_operator_admin.sql`
15) `0015_rls_policies_company.sql`
16) `0016_rls_policies_partner.sql`
17) `0017_seed_roles_permissions.sql`
18) `0018_seed_development_data.sql`

## 5. 各migrationで含めるもの / 含めないもの

### 0001_extensions_and_enums.sql

**含める:**
- `pgcrypto` など必須拡張
- role, invention_status, disclosure_level, deal_status, ip_strategy, file_scope, event_action の作成

**含めない:**
- ドメイン固有制約（unique/index追加）
- storageポリシー

---

### 0002_profiles_and_organizations.sql

**含める:**
- `users_profile`, `organizations`, `organization_members`
- 軽量制約（PK/FK/基本型）

**含めない:**
- 社内分析用の拡張カラム（将来）
- 厳密なメール正規化制約

---

### 0003_inventions_core.sql

**含める:**
- `inventions`
- `invention_files`（core列）
- `invention_submission_checks`
- `invention_status_events`（履歴テーブル）

**含めない:**
- score/scrutiny の本体ロジック
- 取得済み診断の要約表示キャッシュ

---

### 0004_invention_submission_and_status.sql

**含める:**
- `invention_submission_checks`
- `invention_status_events`
- ステータス関連の補助インデックス（`inventions.status`, `created_at`）

**含めない:**
- 画面の進行ガイダンス文言のハードコード

---

### 0005_screening_and_ip_strategy.sql

**含める:**
- `invention_screening_reports`
- `invention_screening_scores`
- `prior_art_items`
- `ip_strategy_notes`

**含めない:**
- 自動類似検索ロジック（MVP後）
- 外部検索APIキー情報

---

### 0006_company_accounts_and_members.sql

**含める:**
- `company_accounts`
- `company_members`

**含めない:**
- 企業請求先/契約先マスターの本番用詳細
- `organizations`との強制結合

---

### 0007_nda_and_disclosure.sql

**含める:**
- `nda_acceptances`
- `company_disclosure_requests`
- `company_invention_views`
- 監査観点で重要な外部キー（invention/company）

**含めない:**
- 法務文言の本文データ（将来テンプレートテーブル）
- 開示停止の自動判定ロジック（RLS/API連携で実装）

---

### 0008_deal_pipeline.sql

**含める:**
- `deal_pipeline`
- `deal_status_events`

**含めない:**
- 成約済み条件の正規化スキーマ（将来）
- 監査署名方式の実装

---

### 0009_revenue_events.sql

**含める:**
- `revenue_events`

**含めない:**
- 支払ゲートウェイ連携の詳細
- 複雑な計算式のCHECK（MVPではAPI側検証）

---

### 0010_audit_logs.sql

**含める:**
- `audit_logs` 本体
- 監査共通カラム（event_type, action, actor, request_id, target）
- 検索用のインデックス（event_at/actor_user_id/target_id）

**含めない:**
- 秘匿情報の全文保存（本体ポリシーで禁止）

---

### 0011_storage_buckets_and_policies.sql

**含める:**
- `invention-files`, `company-disclosure-files`, `legal-documents`, `public-assets`
- bucket policy雛形（private/publicの分類）

**含めない:**
- ファイル内容のウイルス判定ジョブ定義
- 透かし付与処理

---

### 0012_rls_enablement.sql

**含める:**
- RLS有効化のベースセット
- 通常参照を許可しない安全既定（fail-secure）

**含めない:**
- 複雑な OR 条件を含む最終ポリシー（後続で追加）

---

### 0013〜0016 RLS policies

- `0013_rls_policies_inventor.sql`: inventor中心の自己参照、提出前後の保護
- `0014_rls_policies_operator_admin.sql`: operator/admin 全体管理権限
- `0015_rls_policies_company.sql`: company_user/company_admin/company_legal_reviewer の閲覧境界
- `0016_rls_policies_partner.sql`: patent_attorney_partner の参照境界（read-only暫定）

**含めない:**
- ステータス妥当性をRLSで完全再現する複雑ルール
- 契約条件の法務判定ルール

---

### 0017_seed_roles_permissions.sql

**含める:**
- `roles`
- `permissions`
- `role_permissions`
- `service_role` 前提の運用フラグ（必要なら）

**含めない:**
- 実在ユーザー情報
- 本番運用アカウント

---

### 0018_seed_development_data.sql

**含める:**
- 開発用ダミーユーザー/案件/会社/NDAログ（実在情報なし）

**含めない:**
- 本番企業情報、秘密資料、実在の発明機密

## 6. FK依存関係と順序

- `users_profile` 系は、会社/発明の核となるため `0002` で先行。
- `inventions` 系は `0003` で先に作る。
- 開示/取引系は `inventions` と `company_accounts` が揃ってから。
- `audit_logs` は最後寄りに作りつつ、他テーブルの `target_id` 参照が想定しやすいように先に基盤完了を確認。
- 競合管理 (`company_invention_views` 利用) は開示/閲覧監査として NDAテーブル後に導入。

## 7. enum変更時の注意点

- enum値を追加する場合、既存値削除は原則しない。
- 変更が必要な場合は:
  1. 一時値追加
  2. 既存データ変換
  3. 参照先更新
  4. 古い値は保持したまま移行（最終的に非推奨化）
- `disclosure_level`/`event_action` は後方互換を壊しやすいため、MVPでは値追加のみ。

## 8. destructive migration回避原則

- `DROP COLUMN` や `DROP TYPE` は実装初期では行わない。
- 制約は初回は緩く、実証後に `ALTER` で強化。
- rollbackが難しい操作（値削除）を避ける。

## 9. MVPで後回しのmigration

- 画像/動画透かしやスキャン連携
- 高度な競合企業自動最適化（同時開示回避エンジン）
- 条件テンプレートの高度正規化
- 課金・請求連携スキーマの完全化

## 10. migration実行後の検証項目

- RLS対象テーブルで `SELECT` が意図どおり拒否されること
- inventoion関連の公開情報と機密情報の分離
- signed URL 経路が private bucket 前提であること
- status遷移イベントと監査イベントの連動
- seedで役割別アクセスの差分が再現できること

## 11. rollback方針

- 各migrationを独立化し、`0018` 以降から順に逆実行できる設計を前提。
- 本番では `down` を厳密に手作業定義しない場合、
  - 新規データを失わない削除順序
  - 監査テーブルは論理削除や無効フラグで巻き戻す
  - bucketはパス単位で無効化

## 12. Supabase local未導入段階の扱い

- SQLファイルは未作成のまま、docs上で順序と責務を固定。
- 実装前に migration plan をレビュー済みとして記録。
- 実機導入前にローカル環境（Supabase CLI）で dry run を想定（未導入なら次段階）

## 13. 未決事項

- `organizations` と `company_accounts` の相互参照を将来1-1で持つか、または完全分離するか。
- `roles` / `permissions` はRLS policy定義側でハードコードするか、テーブル参照化するか。
- `audit_logs` の保存先を `jsonb` 厳密化するタイミング。
