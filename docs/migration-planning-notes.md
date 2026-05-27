# Migration Planning Notes

## 1. DB migrationを作る前の注意点

- RLSを有効にする前提で、公開想定を逆算してテーブルを設計する。
- 機密テーブルは最初から private 扱いを前提にし、明示的な `SELECT`/`INSERT` 制限を想定する。
- 外部キーは可能な限り最小必須（nullable）で開始し、運用後に制約強化する。
- 全テーブルに `created_at / updated_at` は必須、`deleted_at` はソフトデリート方針で標準化。
- 法務・NDA・開示ログの要件を無視して後追いで追加しない。最初からフィールドを保持する。

## 2. テーブル作成順（推奨）

1) 基盤
- `pgcrypto`（UUID）
- enums

2) 身元・組織
- `users_profile`
- `organizations`
- `organization_members`

3) 企業関係
- `company_accounts`
- `company_members`

4) 発明コア
- `inventions`
- `invention_files`
- `invention_submission_checks`
- `invention_status_events`

5) 一次診断関連
- `invention_screening_reports`
- `invention_screening_scores`
- `prior_art_items`
- `ip_strategy_notes`

6) 企業開示
- `nda_acceptances`
- `company_disclosure_requests`
- `company_invention_views`

7) 取引
- `deal_pipeline`
- `deal_status_events`
- `revenue_events`

8) 横断監査
- `audit_logs`

## 3. Enum作成順（依存順）

1. `role`
2. `invention_status`
3. `disclosure_level`
4. `deal_status`
5. `ip_strategy`
6. `file_scope`
7. `event_action`

実装時は enum は先に作成し、テーブルで参照する。

## 4. FK依存関係の簡潔な整理

- `organizations` は `users_profile` 参照。
- 発明 (`inventions`) は `users_profile`（発明者）と `organizations` に依存。
- 企業開示・取引・閲覧ログ系は `company_accounts` と `inventions` の双方参照。
- 取引・監査は `inventions` + `users_profile` + `company_accounts` を共通の根に持つ。

## 5. `organizations` と `company_accounts` 未決の暫定方針

- MVPでは分離運用を維持。
  - `organizations`: 個人運営・社内運用・将来分析用。
  - `company_accounts`: 外部企業向け機能の実務単位。
- `organization_members` は個人側、`company_members` は企業側。
- 暫定的に横断キーは設けず、アプリケーション層で必要に応じて参照変換。

## 6. migrationを小さく分ける方針

- 1コミット（将来）は「1～2テーブル + 1～2ポリシー + 対応seed + 最小テスト」に分割。
- 機密境界に影響する migration は別ファイル化。
- 失敗時ロールバック容易性を優先し、既存データに依存しない順序にする。

## 7. destructive migrationを避ける方針

- 既存列/enum値の直接dropではなく `ADD` → `fill` → `rename` の順序を取る。
- nullable化は一時的に許容し、後で NOT NULL へ段階的化。
- 既存データの一括再生成は最後。MVP初期は `TRUNCATE` ではなく移行スクリプトを意識。

## 8. audit_logsを後付けで壊さない方針

- `audit_logs` を最後に作る場合でも FK を厳密化しすぎない。
- target_id/関連IDは運用で参照可能な粒度を保つ。
- メタ情報に必要最小の `jsonb` を許容し、後日正規化。
- `event_type` は実装前に固定リストを決め、過不足を減らす。

## 9. private fileとstorage bucketをDBより先に決める理由

- `invention_files.file_scope` と bucket名（private/public）を先に合意しないと、後からRLS条件と不整合。
- 開示レベルごとに参照経路（signed URL API）を固定する必要があるため。
- 規制上、同一ファイルを再定義した場合の監査整合が難しくなるため、MVP前に明確化が必須。

## 10. 初期PoCで作る最小テーブルセット

1. `organizations`
2. `users_profile`
3. `inventions`
4. `invention_files`
5. `invention_status_events`
6. `invention_submission_checks`
7. `company_accounts`
8. `company_members`
9. `nda_acceptances`
10. `company_disclosure_requests`
11. `company_invention_views`
12. `audit_logs`

この10〜12テーブルで以下を通す:
- 発明投稿、下書き/提出、開示申請（要約レベル）、NDAログ付き閲覧、監査可観測。

## 11. 後回しにできるテーブル

- `invention_screening_reports`
- `invention_screening_scores`
- `prior_art_items`
- `ip_strategy_notes`
- `deal_pipeline`
- `deal_status_events`
- `revenue_events`

理由: 初期PoCでまず「秘密情報保護を壊さない投稿〜開示」までを検証するため。

## 12. 初期PoC時の失敗対策

- 事前に「見えてはいけない列」を一覧化し、ビューで誤露出を検知。
- migration適用前に「NDA前には企業へ開示情報を返さない」シナリオテストを設計。
- `git diff --check` は実装前・実装後とも継続。SQL未作成時もdocs変更の整合確認。
