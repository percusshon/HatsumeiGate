# Seed Data and Roles Plan

## 1. 初期seed方針

- 実データを入れず、MVP検証ができる最小セットを用意。
- パスワード・個人情報・発明固有の秘密情報を seed に入れない。
- ロールは最小権限原則から付与。

## 2. 初期role（MVP）

- `inventor`
- `operator`
- `reviewer`
- `patent_attorney_partner`
- `company_user`
- `company_admin`
- `company_legal_reviewer`
- `admin`

## 3. 初期permission seed

- inventors: 草稿/提出/自己閲覧中心。
- operator: 案件監査・診断・開示準備・取引更新。
- reviewer: review中心。
- patent_attorney_partner: 先行技術/知財ノート参照。
- company_user: teaser取得、開示申請。
- company_admin: NDA同意・開示決裁・取引更新。
- company_legal_reviewer: 法務確認領域。
- admin: 全件閲覧・監査・ロール管理。

## 4. role_permission seed設計（例）

- `inventor` 例: `invention:create_draft`, `invention:edit_draft`, `invention:submit`, `invention:view_self`, `status:read`, `file:*`
- `operator` 例: `status:update`, `screening_report:*`, `prior_art:manage`, `ip_strategy_note:manage`, `company:view_disclosed_item`, `deal:update_status`
- `company_admin` 例: `company:accept_nda`, `company:view_disclosed_item`, `deal:update_status`, `deal:update_terms`
- `admin` 例: `admin:read_all`, `admin:manage_users`, `admin:manage_accounts`, `audit_log:read`

## 5. 開発用テストユーザー案（ダミー）

- `inventor_demo_01`
  - role: inventor
  - status: active
- `operator_demo_01`
  - role: operator
- `company_admin_demo_01`
  - role: company_admin
  - 所属: demo-company
- `company_user_demo_01`
  - role: company_user
- `patent_partner_demo_01`
  - role: patent_attorney_partner
- `admin_demo_01`
  - role: admin

上記はメール/IDはダミー規則に準拠し、実在情報を含めない。

## 6. サンプル発明案件（seed）

- 3件程度のみ。
  - `case_music_infra`（音楽現場支援）
  - `case_live_latency`（ライブ現場改善）
  - `case_creator_workflow`（クリエイター向け運用ツール）

各案件に以下を付与:
- 代表タイトル/課題/既存不満/想定利用シーン
- status draft/submitted/screening
- 投稿前チェック（最低項目のみ）

## 7. サンプル会社アカウント

- `company_demo_a`: `company_user`/`company_admin` が1名ずつ。
- `company_demo_b`: 検討フェーズ用。
- いずれも公開情報だけを使用し、実在企業名を使わない。

## 8. NDA acceptanceサンプル

- `level_2` 受諾サンプル
- `level_3` 受諾サンプル
- 有効期限あり・期限切れありを1件ずつ。

## 9. 開示リクエストサンプル

- `company_disclosure_requests`:
  - stage: `approved`
  - stage: `requested`
  - stage: `denied`（競合制限例）
- level の昇降遷移をテスト可能な形で。

## 10. deal pipelineサンプル

- `interested`（未NDA）
- `nda_requested` / `nda_accepted`
- `terms_proposed` / `negotiating`
- `licensed`（成功例） or `declined`（不成立例）

## 11. audit log サンプル

- 主要イベントを最低1件ずつ:
  - invention submit, status changed, file uploaded
  - disclosure request
  - nda accepted
  - company view logged
  - deal status changed

## 12. 運用上のseed注意

- 本番投入時に削除・差し替え可能な seed 方式。
- 機密情報（詳細図面、第三者素材、実開示資料）を seed へ入れない。
- NDA/権利帰属の情報はダミー文字列。

## 13. 未決事項

- 企業アカウント/ロールの初期権限を `company_admin` / `company_user` とどこまで分けるか。
- `service_role` のみが見る監査ダッシュボードと開発者向け監査の分離。
- 実データ移行時に sample を自動クリーンするルーチン。
