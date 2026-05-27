# MVP Validation Checklist

## 1. docs-only 検証

- [ ] 主要docs（README/AGENTS/業務ロジック/docs）が参照整合している
- [ ] 同じ定義（status, role, disclosure level）で命名が統一されている
- [ ] 禁止事項（保証表現、販売マーケット化、NDA前開示）が混入していない
- [ ] `docs/implementation-roadmap.md` と `migration-planning-notes.md` が連動している

## 2. migration検証

- [ ] テーブル順と依存順が循環なしで説明できる
- [ ] enum 依存を先に定義できる
- [ ] `organizations` と `company_accounts` の未決事項を「暫定方針」として明示
- [ ] MVP最小テーブルと後回しテーブルを区別できる
- [ ] destructive方針を避ける判断が明文化されている

## 3. RLS検証

- [ ] 最初からRLS対象テーブルが確定している
- [ ] inventor/company/operator/admin/patent_partner権限境界が明確
- [ ] 企業NDA前後の閲覧分離がRLSまたはAPIガードに記載
- [ ] 閲覧ログなしで詳細返却しない原則が明示
- [ ] service_role 限定操作（署名発行・監査エクスポート）が分離

## 4. Storage policy検証

- [ ] private/public の bucket 境界が一貫
- [ ] level0〜4 の配信可否が定義されている
- [ ] signed URL の有効期限方針がある
- [ ] NDA前のファイルアクセス拒否が明記されている
- [ ] ファイルview/downloadログ項目が定義されている

## 5. seed data検証

- [ ] role / permission / role_permission の初期構成がある
- [ ] 開発用サンプルユーザーとサンプル案件が定義される
- [ ] サンプルに本物の個人情報・秘密情報を入れていない
- [ ] 非運用データと運用データ分離が可能

## 6. API検証（実装前観点）

- [ ] invention draft/submission の入出力が仕様化
- [ ] status更新時の監査対象イベントが一致
- [ ] company disclosure APIが開示レベルとNDA条件を持つ
- [ ] エラー応答規約（400/401/403/409/412）が統一
- [ ] 機密情報を返さないレスポンス方針（最小フィールド）

## 7. UI検証（実装前設計）

- [ ] 発明者UIで投稿前チェック必須フローが確認できる
- [ ] 運営UIで status 遷移と内部メモ分離が確認できる
- [ ] 企業UIで募集/開示/閲覧レベル遷移が確認できる
- [ ] 競合企業制御の表示文言がある

## 8. audit log検証

- [ ] イベント種別が網羅的
- [ ] 機密値の本文埋め込みを避ける方針が明記
- [ ] request_id/actor_role/disclosure_level の必須性がある
- [ ] 不正時ログ（拒否/失敗）を追跡できる

## 9. invention submission flow検証

- [ ] draft → submit → screening → prior_art_research まで到達可能
- [ ] needs_more_info 復帰が可能
- [ ] 取り下げ/拒否時に archived 以外の終端を混在しない

## 10. status transition検証

- [ ] `docs/invention-state-machine.md` の正常遷移が実装方針化
- [ ] 差し戻し遷移を実装時に誤起動しない定義
- [ ] 企業側と運営側の通知タイミングを分離

## 11. disclosure level検証

- [ ] level_0〜4 の見せる/隠す情報が API 応答レベルで一致
- [ ] 発明者同意なしで detail 開示しない
- [ ] 競合制限時は自動縮退または停止

## 12. NDA前後境界検証

- [ ] NDA未成立時は level_2以上を返さない
- [ ] NDA有効期限切れ時に自動停止
- [ ] 条件付きで再承認が必要なリクエストを扱える

## 13. company view logging検証

- [ ] 企業閲覧前に `company_invention_views` のレコード作成が要件に含まれる
- [ ] signed URL 発行 API と views ログがトランザクション連携
- [ ] 拒否時もログ（拒否理由）を残す

## 14. file signed URL検証

- [ ] 署名URL有効期限の上限/下限を統一
- [ ] レベル不一致時は404/403を返す
- [ ] download回数上限に未達時は許可、超過時は拒否ログ

## 15. deal pipeline検証

- [ ] 取引status no_interest〜closed がstate図と一致
- [ ] 成功報酬イベントの発生条件が明確
- [ ] 弁護士確認/弁理士確認ポイントが通知できる
- [ ] 成立/不成立の事由が保存される

## 16. 技術検証

- [ ] `git status --short`
- [ ] `git diff --check`
- [ ] （実装後）lint / typecheck / build
- [ ] API監査観点で最低限のテストシナリオを作成

## 17. コミット前チェック

- [ ] 変更ファイル一覧が意図通りか
- [ ] docsのみでSQL/実装コード未追加か
- [ ] 既存docs改変がないか
- [ ] レビュー観点（未決事項・リスク）を明示

## 18. リリース前チェック

- [ ] NDA・開示・企業競合規約が最新であるか（法務確認前提）
- [ ] 環境変数やシークレット管理手順を用意
- [ ] 運用ロール付与、企業招待、監査ログ保持期間が定義されているか
- [ ] ロールバック手順（DB/migration、bucket）を定義

## 19. 未決事項

- 会社アカウント・組織モデルを長期的にどう統合するか。
- 取引成立時のrevenueイベント金額精度（契約前後どちらで記録するか）。
- 画像・動画ファイルの透かし仕様を実装前に確定。
