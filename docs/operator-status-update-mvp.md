# Operator status update MVP

## 実装範囲

operator / admin が、内部審査フェーズの発明案件のステータスを state machine 準拠で遷移させ、`invention_status_events` に履歴を記録する最小MVPです。

- `/operator`：ダッシュボード文言を「審査対象案件 + ステータス更新」に更新
- `/operator/inventions`：表示対象を `submitted` 単独から内部審査フェーズ群へ拡張
- `/operator/inventions/[id]`：ステータス更新フォームを追加（遷移先選択・理由・発明者可視フラグ）
- `lib/invention/status.ts`：ステータス日本語ラベルと operator 遷移マップ、遷移検証ヘルパー
- `app/operator/inventions/[id]/actions.ts`：`updateInventionStatusAction`

## 対象ステータス（内部審査フェーズのみ）

`submitted` / `screening` / `needs_more_info` / `prior_art_research` / `ip_strategy_review` / `prototype_review` / `attorney_review_ready`

## operator が実行できる遷移

- `submitted -> screening | needs_more_info | rejected`
- `screening -> prior_art_research | needs_more_info | rejected`
- `needs_more_info -> screening | rejected`
- `prior_art_research -> ip_strategy_review | needs_more_info | rejected`
- `ip_strategy_review -> prototype_review | attorney_review_ready | needs_more_info | rejected`
- `prototype_review -> attorney_review_ready | needs_more_info | rejected`
- `attorney_review_ready -> needs_more_info | rejected`

`docs/invention-state-machine.md` を出典とし、operator 起点の内部審査遷移のみを採用しています。

## 未実装範囲（意図的に除外）

- `company_disclosure_ready` 以降の企業開示・NDA・閲覧ログ・開示レベル制御（roadmap Phase 11）
- `negotiating` / `licensed` / `assigned` / `joint_development` などの取引（deal）系遷移（roadmap Phase 13）
- 審査レポート作成（`invention_screening_reports` / スコア / 先行技術ノート）
- ファイルアップロード・signed URL 発行
- `audit_logs` への記録（`invention_status_events` のみ記録、監査ログ連動は Phase 12）

## セキュリティ・RLS前提

- `service_role` は利用しない。
- ステータス更新は `inventions_update_internal`（operator/admin）、履歴記録は `invention_status_events_insert_ops_admin`（operator/admin）の既存RLSに依存。マイグレーション追加なし。
- 遷移検証は state machine（`lib/invention/status.ts`）+ DB 更新時の `from_status` 一致条件（`.eq('status', fromStatus)`）で二重化。
- サーバアクション側でも operator/admin ロールを事前ガード。

## 確認ポイント

- 許可されていない遷移が `invalid_transition` で拒否されること
- 内部審査フェーズ外（draft/withdrawn/archived/company系）の案件が operator 一覧・詳細に出ないこと
- 遷移時に `invention_status_events` へ `from_status` / `to_status` / `changed_by` / `reason` / `visible_to_inventor` が記録されること
- 企業開示・取引に関わる遷移を本画面に追加しないこと
- 禁止表現（特許取得保証、企業売却保証、収益保証、法的代理関係表現）を追加しないこと
