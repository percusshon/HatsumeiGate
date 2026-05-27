# RLS Implementation Plan

## 1. 段階的導入方針

1. Phase 0: すべてのテーブルで RLS 有効化前提を宣言。
2. Phase 1: 自身の行のみ（inventor 自己データ）を先行ロック。
3. Phase 2: 運営/admin権限の横断許可追加。
4. Phase 3: 企業閲覧を disclosure レベルとNDAで分離。
5. Phase 4: 法務連携ロール（patent_attorney_partner/company_legal_reviewer）を追加。
6. Phase 5: service_role 除外操作（バッチ、署名発行）を厳格化。

## 2. 最初からRLSを有効にするテーブル

- 企業秘密・開示関連を含むため、まず即時対象:
  - `inventions`
  - `invention_files`
  - `invention_submission_checks`
  - `invention_status_events`
  - `company_disclosure_requests`
  - `company_invention_views`
  - `company_members`
  - `nda_acceptances`
  - `deal_pipeline`
  - `deal_status_events`
  - `audit_logs`
  - `ip_strategy_notes`
  - `prior_art_items`
  - `invention_screening_reports`
  - `invention_screening_scores`
  - `revenue_events`

- 補助情報のみ（比較的緩い）:
  - `organizations`, `organization_members`

## 3. service_role経由に限定する操作

- Signed URL 発行（`storage`）
- システム側監査整合バッチ
- 監査ログエクスポート
- 削除・保持ポリシー実行（ローテーション）
- ロール移管や危険権限更新

## 4. inventor が見られる情報

- 自身発明: `inventions`（所属明細、提出履歴、現在ステータス）。
- 自分が作成した: `invention_submission_checks`, `invention_files`, `invention_status_events`。
- 企業から見た開示済み情報（level_2～）は不可。

### RLS条件（原則）

- `user_id = auth.uid()`。
- `inventions.owner_user_id = auth.uid()`。
- 除外: 管理者/運営が介在するケースは別ロール条件で許可。

## 5. operator / reviewer / admin が見られる情報

- `operator`: 運営担当案件を含む `inventions` 全件閲覧（閲覧可否は担当条件で絞ること）。
- `reviewer`: 運営が割当た案件の読み取り中心。
- `admin`: 全件閲覧 + 監査ログ参照。

### 注意

- ステータス更新は「遷移妥当性」をRLSだけで判定しない。
- `company_disclosure_requests` を経由しない詳細閲覧は拒否。

## 6. company_user のNDA前に見られる範囲

- 企業の初期表示（level_1相当）まで。
- 個別発明の `title`, `category`, `use_scene`, `summary` の匿名化要約。
- 図面・ファイル・詳細実装情報・公開不可能情報は除外。

### RLS実装条件

- 企業アカウント所属のみ可: `company_members.user_id = auth.uid()`。
- 開示レベルと同一会社を照合。
- 開示ステータス `approved` のみ。

## 7. company_user / company_admin / company_legal_reviewer のNDA後範囲

- `company_admin` は level_3/4 の追加取得が可能。
- `company_legal_reviewer` は条件交渉前後の法務領域参照に限定（明示条件で絞る）。
- `company_user` は原則 level_3以下。

### 共有ガード

- いずれも `company_invention_views` が未作成なら 403。
- NDA有効期限外なら閲覧不可。
- 開示停止条件（競合・停止フラグ）に引っかかる場合は拒否。

## 8. patent_attorney_partner が見られる情報

- `invention_screening_reports` / `prior_art_items` / `ip_strategy_notes`（読取主体）。
- 発明本文そのものの詳細公開は不要最小のみ。

### 条件

- 運営承認済み案件のみ。
- `ip_strategy_notes` の read-only優先。

## 9. 閲覧ログなしに詳細情報を返さない原則

- 実装分担:
  - RLS: `exists(company_invention_views)` の可否で基本拒否。
  - API: `insert` した閲覧トランザクション成功後のみ詳細返却。
- 例外なし。

## 10. RLSだけで守れないため API 側で守るもの

- ステータス遷移妥当性（from→to）。
- NDAの有効期限内再判定。
- 競合企業制御（同一カテゴリ多社同時開示制限）。
- ファイルダウンロード回数上限・短期signed URL更新。
- 重複送信防止/再試行ID（`request_id` の重複排除）。

## 11. テストすべき権限パターン

- inventor 自己案件編集可能、他人案件不可。
- operator が運営案件以外を参照できない。
- company_user が level_1超の情報をNDA未成立で不可。
- company_admin が level_4を取得できるのは該当公開条件を満たす場合のみ。
- patent_attorney_partner が発明本文全文に不必要にアクセスできない。
- admin が全件参照と監査読取ができる。

## 12. 参考実装順（RLS）

1. users_profile / organizations
2. inventions / invention_status_events
3. company_accounts / company_members
4. submission checks / screening / ip strategy / prior art
5. files / disclosures / views
6. deal + revenue
7. audit_logs

## 13. 未決事項

- `reviewer` と `patent_attorney_partner` の「同一案件アクセス条件」を厳密に統一する。
- `company_legal_reviewer` に review-only か terms-edit を許容するか。
- 競合開示制御の完全ロジックをDB制約に入れるかAPI制御に寄せるか。
