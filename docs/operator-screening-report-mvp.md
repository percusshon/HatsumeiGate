# Operator screening report MVP

## 実装範囲

operator / reviewer / admin が、審査対象の発明に対し一次診断レポートを作成・表示する最小MVP（roadmap Phase 10 中核）。

- `lib/invention/screening.ts`：評価軸（8軸）・総合判定（A〜E）のラベルと検証ヘルパー
- `app/operator/inventions/[id]/screening-actions.ts`：`createScreeningReportAction`
- `app/operator/inventions/[id]/page.tsx`：審査レポートの一覧表示 + 新規作成フォームを追加
- `/operator`：未着手領域の文言更新

## データ

- `invention_screening_reports`：overall_rating(A〜E) / summary / recommendation / next_action / reviewer_id
- `invention_screening_scores`：axis（8軸）/ score(0〜5) / rationale。report 単位に紐づく。

評価軸とスコア定義は `docs/invention-screening-logic.md` を出典とする（各軸0〜5、高いほど良い）。

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 作成は migration 0014 の `invention_screening_reports_mutate_internal` / `invention_screening_scores_mutate_internal`（operator/reviewer/admin）に依存。マイグレーション追加なし。
- スコアは report 挿入前に範囲検証（0〜5の整数）し、不正値で孤立レポートを作らない。
- サーバアクション側でも operator/reviewer/admin ロールを事前ガード。

## 未実装範囲（意図的に除外）

- レポート・スコアの編集／削除（追記のみ）
- 発明者向け要約と内部詳細の表示分離（外部公開は別増分）
- 主要リスクTOP3・追加質問カテゴリなどの構造化項目
- 先行技術アイテム（`prior_art_items`）・知財方針ノート（`ip_strategy_notes`）の入力UI
- audit_logs 連動（Phase 12）

## 確認ポイント

- スコアが0〜5外のとき `invalid_score` で拒否されること
- 全項目空のとき `empty_report` で拒否されること
- 作成したレポートと軸別スコアが詳細画面に表示されること
- 断定的な保証表現（特許取得保証・企業売却保証・収益保証）を画面文言に含めないこと
