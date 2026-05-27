# Role / Permission Matrix (Bridge)

## 1. 目的

Supabase RLSとAPI実装の分担を明確化するため、Hatsumei Gate のロール別permissionをMVP実装可能な形で固定する。

## 2. 対象Role

- inventor
- operator
- reviewer
- patent_attorney_partner
- company_user
- company_admin
- company_legal_reviewer
- admin
- service_role

## 3. Permission候補

- profile:read_self
- profile:update_self
- invention:create_draft
- invention:update_own_draft
- invention:submit_own
- invention:read_own
- invention:read_assigned
- invention:read_all_internal
- invention:update_status
- invention:archive
- submission_check:write_own
- file:upload_own
- file:read_own
- file:read_disclosed
- file:create_signed_url
- screening:read
- screening:write
- prior_art:read
- prior_art:write
- ip_strategy:read
- ip_strategy:write
- company_account:request
- company_account:review
- nda:accept
- disclosure:request
- disclosure:approve
- disclosure:view_teaser
- disclosure:view_nda_summary
- disclosure:view_detail
- disclosure:view_negotiation_package
- deal:read
- deal:update
- revenue:read
- revenue:write
- audit:read_own
- audit:read_invention
- audit:read_all
- admin:manage_users
- admin:manage_roles

## 4. permissionマップ（MVP実装版）

| permission | inventor | operator | reviewer | patent_attorney_partner | company_user | company_admin | company_legal_reviewer | admin | service_role |
|---|---|---|---|---|---|---|---|---|---|
| profile:read_self | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| profile:update_self | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| invention:create_draft | ○ |  |  |  |  |  |  | ○ | ○ |
| invention:update_own_draft | ○ |  |  |  |  |  |  | ○ | ○ |
| invention:submit_own | ○ |  |  |  |  |  |  | ○ | ○ |
| invention:read_own | ○ | ○ | ○ | ○ |  |  |  | ○ | ○ |
| invention:read_assigned |  | ○ | ○ |  |  | ○ | ○ | ○ | ○ |
| invention:read_all_internal |  | ○ |  |  |  |  |  | ○ | ○ |
| invention:update_status |  | ○ | ○ |  |  | ○ | ○ | ○ | ○ |
| invention:archive |  | ○ |  |  |  |  |  | ○ | ○ |
| submission_check:write_own | ○ | ○ |  |  |  |  |  | ○ | ○ |
| file:upload_own | ○ | ○ |  |  |  |  |  | ○ | ○ |
| file:read_own | ○ | ○ |  |  |  |  |  | ○ | ○ |
| file:read_disclosed |  |  |  |  | ○ | ○ | ○ | ○ | ○ |
| file:create_signed_url |  | ○ |  |  | ○ | ○ | ○ | ○ | ○ |
| screening:read |  | ○ | ○ | ○* |  |  |  | ○ | ○ |
| screening:write |  | ○ |  | ○? |  |  |  | ○ | ○ |
| prior_art:read |  | ○ | ○ | ○* |  |  |  | ○ | ○ |
| prior_art:write |  | ○ |  | ○? |  |  |  | ○ | ○ |
| ip_strategy:read |  | ○ | ○ | ○* |  |  |  | ○ | ○ |
| ip_strategy:write |  | ○ |  | ○? |  |  |  | ○ | ○ |
| company_account:request |  |  |  |  | ○ | ○ | ○ | ○ | ○ |
| company_account:review |  |  |  |  |  | ○ | ○ | ○ | ○ |
| nda:accept |  |  |  |  | ○ | ○ | ○ | ○ | ○ |
| disclosure:request |  | ○ |  |  | ○ | ○ | ○ | ○ | ○ |
| disclosure:approve |  | ○ |  |  |  | ○ | ○ | ○ | ○ |
| disclosure:view_teaser |  |  |  |  | ○ | ○ | ○ | ○ | ○ |
| disclosure:view_nda_summary |  |  |  |  | ○ | ○ | ○ | ○ | ○ |
| disclosure:view_detail |  |  |  |  |  | ○ | ○ | ○ | ○ |
| disclosure:view_negotiation_package |  |  |  |  |  | ○ | ○ | ○ | ○ |
| deal:read | ○（自案件） | ○ |  |  | ○ | ○ | ○ | ○ | ○ |
| deal:update |  | ○ |  |  |  | ○ | ○ | ○ | ○ |
| revenue:read |  | ○ |  |  |  |  |  | ○ | ○ |
| revenue:write |  |  |  |  |  |  |  | ○ | ○ |
| audit:read_own | ○ | ○ |  |  | ○ |  |  | ○ | ○ |
| audit:read_invention |  | ○ |  |  |  |  |  | ○ | ○ |
| audit:read_all |  | ○ |  |  |  |  |  | ○ | ○ |
| admin:manage_users |  |  |  |  |  |  |  | ○ | ○ |
| admin:manage_roles |  |  |  |  |  |  |  | ○ | ○ |

凡例: ○=有効、空欄=原則不可、`?`=運用ルールで条件付き、`*`=read-only想定

## 5. RLS/API/両方ガードの対応

| permission | RLS | API | 運用補足 |
|---|---|---|---|
| profile:read_self / update_self | ○ | ○ | プロファイルはRLSで本人制御、更新はバリデーションAPIで同時確認 |
| invention:create_draft / update_own_draft / submit_own | ○ | ○ | draft更新は投稿者本人の所属と状態検証をAPIで追加 |
| invention:read_own | ○ | ○ | 自身ID一致 + status表示制限 |
| invention:read_assigned / read_all_internal | ○ | ○ | 役割別担当範囲は業務ロールで絞る |
| invention:update_status / archive | ○ | ○ | from/to制約はAPIガードが主、RLSはUPDATE許可範囲制御 |
| submission_check:write_own | ○ | ○ | 必須同意チェックの最終整合性をAPIで確認 |
| file:upload_own / read_own | ○ | ○ | storage object policy + table policy で二重制御 |
| file:read_disclosed / create_signed_url | ○ | ○ | signed URL はcompany viewログを生成後に発行 |
| screening:read/write | ○ | ○ | rating/scoreの範囲検証はAPI |
| prior_art:* | ○ | ○ | 引用URL、機密情報除外 |
| ip_strategy:* | ○ | ○ | 最終断定NG。候補/注記に限定 |
| company_* 系 | ○ | ○ | 企業アカウント所属、NDA状態、競合制約をAPIで追加 |
| deal:read / update | ○ | ○ | 成立条件と法務確認ポイントはAPIで分岐 |
| revenue:* | ○ | ○ | 金額精度の厳密性は運用後段 |
| audit:* | ○ | ○ | 監査ログの詳細閲覧はadmin限定、本人は本人行のみ |
| admin:* | ○ | ○ | 全体の二段ガード（最上位） |
| service_role |  | ○ | サービス側限定。RLSバイパスにはサービスロール明示 |

## 6. MVPで実装するpermission

### MVP実装
- inventor: profile/self, invention create/update/submit/read_own, submission_check:write_own, file:upload/read_own, file:create_signed_url(本人), screening/prior_art/ip_strategy の read系（運営が必要なら）、audit:read_own
- operator: invention read/read_assigned/read_all_internal, update_status, submission_check閲覧補助, screening/prior_art/ip_strategy write/read, deal read/update, audit read_invention
- reviewer: inventor read/assigned read, screening/prior_art/ip_strategy read, status read
- company_user: company_account:request, nda:accept, disclosure view系(teaser→nda_summary), file:read_disclosed, deal read
- company_admin: company_* review, disclosure approve, detail閲覧、deal update
- company_legal_reviewer: disclosure view/legal系、deal update条件付き
- admin: 全権限
- service_role: signed URL発行、監査整合ジョブ、メンテナンス処理

### 後回し
- revenue:write/read（完全実装）
- 発明者以外の広範な deal update 詳細権限
- patent_attorney_partner の広め書き込み領域（read-only固定運用）

## 7. service_role限定操作

- storage signed URL の発行・削除
- 監査ログ集計・エクスポート
- バッチでの開示停止/期限切れ無効化
- 権限付与状態の補助更新

## 8. 企業NDA前後の差分（permission）

- 事前: `disclosure:view_teaser` まで、`disclosure:request` と `nda:accept` が成立前提
- 事後: `disclosure:view_nda_summary` が有効化
- level_3: `disclosure:view_detail` を追加許可、`file:create_signed_url` 条件付き
- level_4: `disclosure:view_negotiation_package` 追加。`file:read_disclosed` で配布情報が限定

## 9. patent_attorney_partner境界（未決事項）

- 現状は read-only と暫定。
- 将来以下の判定が必要:
  - 相談メモ添付可否
  - 外部ファイル参照制御
  - 開示前資料の閲覧可否（運営承認時のみ）
- 未決として、初期は `screening:write / prior_art:write / ip_strategy:write` を `?` 運用で限定化し、最初は read-only から開始する。
