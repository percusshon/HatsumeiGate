# RLSと権限設計（Supabase想定）

## 1. 役割（role）

- `inventor`
- `operator`
- `reviewer`
- `patent_attorney_partner`
- `company_user`
- `company_admin`
- `company_legal_reviewer`
- `admin`

## 2. 権限制御の基本方針

- Supabase Auth JWTのロールクレームと `users_profile.role` を照合。
- すべての業務テーブルで RLS を有効化。
- ただし、ステータス遷移やNDA制約などは
  - `CHECK`（サーバー側ロジック）
  - `RPC`（セーフガード）
  の併用で API 側もガード。

---

## 3. Permission一覧（候補）

- `invention:create_draft`
- `invention:edit_draft`
- `invention:submit`
- `invention:view_self`
- `submission_check:create`
- `submission_check:view`
- `status:read`
- `status:update`
- `screening_report:create`
- `screening_report:update`
- `prior_art:manage`
- `ip_strategy_note:manage`
- `file:upload`
- `file:list`
- `file:download`
- `company:view_teaser`
- `company:request_disclosure`
- `company:accept_nda`
- `company:view_disclosed_item`
- `deal:view`
- `deal:update_status`
- `deal:update_terms`
- `deal:read_revenue`
- `revenue:record`
- `audit_log:read`
- `admin:read_all`
- `admin:manage_users`
- `admin:manage_accounts`

---

## 4. roleとpermission対応表

### inventor
- `invention:create_draft`, `invention:edit_draft`, `invention:submit`, `invention:view_self`
- `submission_check:create`, `submission_check:view`
- `status:read`
- `file:upload`, `file:list`, `file:download`
- `deal:view`（自案件）

### operator
- `invention:view_self`（閲覧対象を担当外でも運営範囲）
- `status:update`
- `screening_report:create`, `screening_report:update`
- `prior_art:manage`
- `ip_strategy_note:manage`
- `submission_check:view`
- `company:view_disclosed_item`（制御ルール付き）
- `deal:view`, `deal:update_status`, `deal:update_terms`
- `audit_log:read`（運営範囲）

### reviewer
- operatorの `status:update` + 監査用途での閲覧（閲覧範囲は担当案件限定）

### patent_attorney_partner
- `invention:view_self`（閲覧対象案件のみ）
- `prior_art:manage`（read-only推奨）
- `ip_strategy_note:manage`（read-only推奨）
- `deal:view`（該当案件）

### company_user
- `company:view_teaser`
- `company:request_disclosure`
- `company:view_disclosed_item`（NDAレベル条件を満たす場合）

### company_admin
- `company_user` 権限 + `company:accept_nda`, `deal:update_status` の一部

### company_legal_reviewer
- `company_admin` 権限 + 弁護士レビュー前提の読み取りを追加
- `company:accept_nda`, `deal:view`, `deal:update_terms`（条件交渉フェーズのみ）

### admin
- 全権限
- `admin:read_all`, `admin:manage_users`, `admin:manage_accounts`, `audit_log:read`

---

## 5. Supabase RLS前提の設計

- `users_profile`
  - 自分の行のみ参照可
  - admin は全件
- `organizations`
  - 利用者は所属組織のみ
  - admin は全件
- `inventions`
  - inventor: 自身のみ
  - operator/reviewer/admin: 全件（運営権限で制御）
  - company系: disclosure request/NDAを満たしたレコードのみ
- `invention_status_events`
  - operator/admin: 全件
  - inventor: 自身案件のみ
- `invention_submission_checks`
  - inventor: 自案件のみ（read self）
  - operator/admin: 全件
- `invention_files`
  - inventor: 自案件のファイルのみ
  - operator/admin: 自案件・担当案件または全件
  - company系: 開示レベルとNDA条件を満たす場合のみ
- `company_disclosure_requests`
  - company系: 自社のみ
  - operator/admin: 全件
- `nda_acceptances`
  - company系: 自社関連のみ
  - operator/admin: 全件
- `deal_pipeline`, `deal_status_events`, `revenue_events`
  - inventor: 自案件のみ
  - company_admin: 自社取引のみ
  - operator/admin: 担当範囲/全件
- `audit_logs`
  - adminのみ原則可

---

## 6. 発明者が見られる情報

- 自案件の以下を取得可能
  - draft内容（全体）
  - 自分の提出チェック状態
  - ステータス履歴
  - スクリーン結果（診断結果）
  - 開示制御メモ（公開上の扱い方含む）
- ただし運営コメントの一部機密（内部メモ）は `operator_internal_only` フラグ付きで隠蔽。

---

## 7. 運営が見られる情報

- 全案件、ステータス、開示リクエスト、NDA状態、取引情報。
- 企業情報は業務目的に必要な範囲のみ。
- 監査対象外の個人連絡先は最小限表示。

---

## 8. 企業がNDA前に見られる情報

- level_0 / level_1 想定。
- タイトル（匿名可）、課題要約、想定シーン、利用シーン、公開情報、非秘匿版だけ。
- 例外: 申請前提での表示が無効な場合は404扱い（存在隠蔽）。

---

## 9. 企業がNDA後に見られる情報

- 開示承認済みかつ対応するレベルで許可された情報のみ。
- レベル上昇に応じて、比較表、実装要件、図面、評価サマリ、価格帯が付与。
- level_4 では交渉資料を最小範囲で提供（`company_disclosure_requests` と連動）。

---

## 10. patent_attorney_partnerが見られる情報

- `invention` のタイトル・要旨・先行技術差分・スクリーン指標・IP候補のみ。
- 企業側の実名接触先・価格条件・交渉履歴は通常不可。
- 利害衝突チェックが必要な場合は案件配布を制限。

---

## 11. adminのみ可能な操作

- ユーザー権限変更
- 組織停止/停止解除
- レポート・監査ログ全文取得
- RLS設定変更（実運用では別管理）
- ロール再割当

---

## 12. service roleでのみ可能な操作

- バックグラウンドジョブ（定期クリーンアップ、期限切れNDA自動失効）
- signed URL発行（権限チェック後）
- 大量監査書出（エクスポート処理）
- 違反検知時のアカウント一時停止

---

## 13. private file の signed URL 方針

- Storage bucket は private。
- ファイルアクセスは `GET /files/:id/download` 経由の署名URLのみ。
- URL TTL は10分〜30分。
- 同一URLの再利用防止としてIP/UA/期限条件。
- `company_user` のアクセスは、`company_disclosure_requests` + `nda_acceptances` + level照合を満たした場合のみ。

---

## 14. 閲覧ログなしに詳細情報を返さない方針

- 企業がレベル2〜4を参照する場合は、`company_invention_views` を同時記録。
- 記録に失敗した場合は参照を許可しない。
- 同時に呼び出すべき更新はトランザクションまたはRPC内で原子的に実行。

---

## 15. RLSで守るもの / API側で守るもの

### RLSで守るもの
- 行単位の所有者制御（自分の発明、所属会社、admin権限）
- 論理削除レコードの除外
- 基本的なCRUD制御

### API側で補強するもの
- ステータス遷移の妥当性（from→to）
- NDA/開示レベルの実時間判定
- 競合企業開示制限
- 条件付き表示のフィールド削減（field-level）
- 監査ログ必須化（`audit_logs`への書き込み）
