# RLS検証向け seed fixture 設計

## 1. seed fixture の目的

RLSテストを再現可能にし、
- 役割別アクセス許可
- 所属/割当/承認条件
- NDA前後の見せ方差分
- 監査対象のread-only制御
+
を固定化するため、最小データセット（最終seed化前の設計）を定義する。

## 2. シードにおける機密扱い方針

- 実在する個人情報は使わない。
- 実在企業名・連絡先・住所はダミーのみ。
- 機密文言は疑似テキスト（例: 「機密A」）を使用。
- IP情報の本文は最小構成（短文）に限定。

## 3. auth.users相当のテストユーザー案

- `user_inv_a`, `user_inv_b`, `user_operator`, `user_reviewer`, `user_admin`,
  `user_company_user`, `user_company_admin`, `user_company_legal`, `user_partner`
- 可能であれば本番同等のAuth userId（UUID）をfixtureで固定管理。
- Seed時は `auth.users` 直接INSERTが難しい場合は、`auth.uid()` スイッチ手法を併用。

## 4. users_profile seed案

- テーブル: `users_profile`
- 追加レコード: 上記ユーザーと同数
- 主要項目: `display_name`, `email`, `preferred_language`, `timezone`, `deleted_at: NULL`
- 備考: `profile`作成は認証ユーザーと1:1前提

## 5. user_app_roles seed案

- テーブル: `user_app_roles`
- 役割付与（サンプル）
  - `user_inv_a` → `inventor`
  - `user_inv_b` → `inventor`
  - `user_operator` → `operator`
  - `user_reviewer` → `reviewer`
  - `user_admin` → `admin`
  - `user_company_user` → `company_user`
  - `user_company_admin` → `company_admin`
  - `user_company_legal` → `company_legal_reviewer`
  - `user_partner` → `patent_attorney_partner`

## 6. inventions seed案

- `invention_a`: `inventor_a`所有、title/status: `submitted`想定
- `invention_b`: `inventor_b`所有、title/status: `submitted`想定
- `organization_id`: nullまたは共通組織を明示
- `current_disclosure_level` はケースに応じて低位/高位を付与（テスト分岐用）
- 重要: 削除フラグ運用（`deleted_at`）で生存/削除シーンを用意

## 7. submission / status / screening 系 seed案

- `invention_submission_checks`
  - invention_a/bそれぞれ自作成分を1件ずつ
  - `accepted_terms` を true/false で分岐
- `invention_status_events`
  - invention_a: `draft`→`submitted` の履歴
  - invention_b: `draft` のみ
- `invention_screening_reports`, `invention_screening_scores`, `prior_art_items`, `ip_strategy_notes`
  - invention_aへoperator/reviewerでの入力例
  - invention_bへ最小1件ずつ（見え方比較用）

## 8. company 側 seed案

- `company_accounts`
  - company_account_a, company_account_b
  - review_status を想定値（`pending`/`approved`）
- `company_members`
  - company_account_a に user_company_user / user_company_admin / user_company_legal
  - company_account_b に user_company_user のみ（admin外）
- `nda_acceptances`
  - company_account_a: accepted（有効期限あり）
  - company_account_b: 未承認
- `company_disclosure_requests`
  - approved（invention_a, company_account_a）
  - rejected（invention_b, company_account_b）
  - inventer_approved flags をケース分岐
- `company_invention_views`
  - NDA条件を満たした閲覧ログを1〜2件

## 9. deal / revenue / audit seed方針

- `deal_pipeline` / `deal_status_events`
  - invention_a, company_account_a を対象に最小1件ずつ
  - `deleted_at is null` と履歴2点（`interested`→`evaluating`）
- `revenue_events`
  - admin運用検証用途の最小1件（通常の`audit`ではなく、`revenue`検証に必要なだけ）
- `audit_logs`
  - 代表的イベントを最低限2〜3件
  - auditの`adminのみ`方針を壊さない件数設計

## 10. partner seed案

- `partner_invention_assignments`
+  - `invention_a` に `user_partner` を有効割当
+  - `invention_b` に `user_partner` を revoked（`revoked_at` 設定）
+  - 必要なら別partner2を用意し「他人割当」ケースを追加

## 11. seedファイル配置（将来方針）

- `supabase/seed.sql`（初期最小種データ）
- `supabase/tests/rls_access_tests.sql`（再現SQLまたは注記用）
- 運用前提として、`seed`は別commitで追加する

## 12. seed実装時の重要注意

- auth/usersと`users_profile`同時構築
  - Supabaseローカルでは `auth.users` への直接INSERTが必要な場合あり
  - 代替として service roleを使った事前作成手順の定義を別途作る
- `auth.uid()` 切替
  - テスト実行時は `set_config('request.jwt.claim.sub', '...', true)` 併用が有効
  - セッション切替後は `SET LOCAL` を徹底し、別セッションで副作用を残さない
- service role と authenticated role の分離
  - データ投入は service role 相当
  - 権限検証は authenticated role で実施
  - 署名URL・storage系は本設計ではAPI前提として本テストから除外

## 13. 最小セット（再現順）

1. auth/users + users_profile + user_app_roles
2. inventions + submissions + status events
3. screening系 + prior art + ip strategy
4. company系 + NDA + disclosure
5. partner割当
6. deal/pipeline + revenue/audit（最小）
7. 読み取り/更新/非許可シナリオを順次実施

## 14. 未決事項

- 企業側 `invention` の直接SELECTを「完全禁止」とするか、API DTO経路だけに固定するかの最終運用判断
- `company_invention_views` のINSERT方式（APIのみ or policy許可）をテスト実装フェーズで確定
- `audit_logs`の最小seed件数は、監査要件整合で再調整
