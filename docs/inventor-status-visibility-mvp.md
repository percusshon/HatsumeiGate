# Inventor status visibility MVP

## 実装範囲

発明者が、自分の発明の進捗（運営が `visible_to_inventor = true` で共有したステータスイベント）を確認できるようにする増分。あわせて、提出後に発明が発明者画面から消える不具合を修正。

- `lib/invention/status.ts`：`inventorFacingStatusLabel` を追加（内部フェーズをマスク）
- `app/inventor/page.tsx`：自分の発明をステータス非依存で表示（draft / それ以外に分類）。表示は発明者向けラベル。
- `app/inventor/inventions/[id]/page.tsx`：ステータス非依存で自案件を表示し、発明者可視のステータス履歴を追加。

## 修正した不具合

- これまで発明者一覧・詳細は `status in ('draft','submitted')` に限定していたため、運営が `screening` 等へ遷移させると発明者が自分の発明を参照できなくなっていた。RLS（`inventions_select_own`）は全status許可のため、画面側の過剰な絞り込みを解消。

## 発明者向け表示マスク（state machine doc §7）

`ip_strategy_review` / `prototype_review` / `attorney_review_ready` / `company_disclosure_ready` などの内部フェーズは「審査中」に丸めて表示し、内部運用情報を発明者へ漏らさない。

## セキュリティ・RLS前提

- 表示は migration 0013 の `inventions_select_own` と `invention_status_events_select_visible_own`（visible_to_inventor かつ自案件）に依存。マイグレーション追加なし。
- 発明者には審査レポート・スコア・先行技術・知財方針・deal などの内部テーブルは引き続き非開示（0013 で未公開）。

## ローカル検証（supabase start + seed）

- invention_a の status events 総数1 / 可視1 に対し、inventor_a は1件のみ閲覧（可視のみ）。
- inventor_a は invention_screening_reports を0件（内部データ非開示）。

## 未実装範囲

- 発明者向けの審査結果サマリ（運営が選別した内容のみ）の提供
- needs_more_info に対する発明者からの追加情報提出フロー
- 通知（メール等）連携
