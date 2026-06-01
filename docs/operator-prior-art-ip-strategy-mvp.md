# Operator prior art / IP strategy notes MVP

## 実装範囲

operator / reviewer / admin が、審査対象の発明に先行技術メモと知財方針ノートを追加・表示する最小MVP（roadmap Phase 9/10 の内部審査補強）。

- `lib/invention/ip-strategy.ts`：`ip_strategy_type` ラベルと先行技術リスク水準（low/medium/high）ラベル・検証ヘルパー
- `app/operator/inventions/[id]/notes-actions.ts`：`createPriorArtItemAction` / `createIpStrategyNoteAction`
- `app/operator/inventions/[id]/page.tsx`：先行技術メモ・知財方針ノートの一覧表示 + 追加フォーム

## データ

- `prior_art_items`：title / source_url / source_type / publication_identifier / summary / relevance_note / risk_level(text)
- `ip_strategy_notes`：strategy_type(enum) / note / requires_attorney_review

`risk_level` は text カラムだが、UI 上は low/medium/high の固定候補で運用する。

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 作成は migration 0014 の `prior_art_items_mutate_internal` / `ip_strategy_notes_mutate_internal`（operator/reviewer/admin）に依存。マイグレーション追加なし。
- サーバアクション側でも operator/reviewer/admin ロールを事前ガード。
- 知財方針ノートは内部整理用で、運営が弁理士業務・特許庁手続代理を行う設計にはしない（画面に明記）。

## 未実装範囲（意図的に除外）

- 先行技術・知財方針の編集／削除（追記のみ）
- 弁理士パートナーへの接続・共有
- 発明者向け表示（内部のみ）
- audit_logs 連動（Phase 12）

## 確認ポイント

- 先行技術が title/URL/要約すべて空のとき `empty_prior_art` で拒否されること
- 知財方針の種別未選択時 `strategy_type_required` で拒否されること
- 追加した項目が詳細画面に内部表示されること
- 断定的な保証表現・弁理士業務代理表現を画面に含めないこと
