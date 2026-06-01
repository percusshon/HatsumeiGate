# Operator deal pipeline MVP

## 実装範囲

operator / admin が、既存の取引（`deal_pipeline`）に対し、運営が担うステータス遷移を行い `deal_status_events` に記録する最小MVP（roadmap Phase 13）。

- `lib/deal/status.ts`：deal_status / deal_type のラベルと operator 遷移マップ、検証ヘルパー
- `app/operator/deals/actions.ts`：`updateDealStatusAction`
- `app/operator/deals/page.tsx`：取引一覧（発明・企業・種別・ステータス）+ ステータス更新フォーム（発明者/企業への表示フラグ付き）
- `/operator`：取引パイプラインへの導線追加

## operator が実行できる遷移

`docs/deal-pipeline-state-machine.md` のうち、運営起点・運営承認の遷移のみを採用:

- `no_interest -> closed`
- `nda_requested -> interested`
- `nda_accepted -> no_interest`
- `meeting_completed -> evaluating`
- `evaluating -> terms_proposed`
- `terms_proposed -> evaluating`
- `negotiating -> licensed | assigned | joint_development | declined | closed`
- `licensed | assigned | joint_development | declined -> closed`

会社・発明者単独のアクション（interested / nda_requested / meeting_* 等）は対象外。

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 更新は migration 0014 の `deal_pipeline_update_ops_admin`、イベント記録は `deal_status_events_insert_ops_admin`（operator/admin）に依存。マイグレーション追加なし。
- 遷移検証は state machine（`lib/deal/status.ts`）+ 更新時の `from_status` 一致条件で二重化。
- サーバアクション側でも operator/admin ロールを事前ガード。

## 未実装範囲（意図的に除外）

- 取引（deal）の新規作成（現RLSに deal_pipeline の insert ポリシーが無いため。作成経路の設計確定後に対応）
- 成功報酬・収益イベント（`revenue_events`）の記録（Phase 14）
- 会社・発明者向けの取引表示画面（`deal_status_events` の可視フラグは記録するが表示UIは別増分）
- audit_logs 連動（Phase 12）

## ローカル検証（supabase start + seed）

- operator による deal_pipeline 更新 = UPDATE 1、deal_status_events 追加 = INSERT 0 1。
- company_user による deal_pipeline 更新 = UPDATE 0（ブロック）、自社 deal の閲覧 = 1件。
