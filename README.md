# Hatsumei Gate / 発明ゲート

## サービス情報

- サービス名: Hatsumei Gate
- 日本語表記: 発明ゲート
- リポジトリ名: hatsumei-gate
- ローカル作業フォルダ: `/Users/percusshon/Documents/Codex/2026-05-27/hatsumei-gate`
- タグライン: 個人の発明を、知財と企業提案へつなぐ。

## サービス概要

Hatsumei Gateは、個人・現場職・クリエイター・エンジニアが思いついた発明アイデアを秘密保持付きで投稿し、運営が次を支援するサービスです。

- 一次診断
- 先行技術調査メモ
- 知財方針整理
- 試作検討
- 弁理士相談準備
- 企業提案
- 譲渡 / ライセンス / 共同開発の交渉管理

単なるアイデア投稿サイトではなく、**発明整理・知財化・企業提案支援**を目的とします。

## 現在のプロジェクト状態

- docs-only foundation（業務ロジック設計のみ）
- Next.js / Supabase / Vercel は未導入
- 実装はまだ行っていません

## 重要方針

- 非公開・審査制・招待制の企業閲覧
- NDA前/後で開示情報を分離して管理
- 投稿情報は原則として秘密情報として扱う
- 運営は弁理士業務（特許庁手続の代理）を行わない
- 「特許取得保証」「企業売却保証」「収益化保証」の断定は禁止
- OtoMarketの販売マーケット的文脈をそのまま持ち込まない

## 参照ドキュメント

- [docs/hatsumei-gate-business-logic.md](docs/hatsumei-gate-business-logic.md)
- [docs/invention-status-workflow.md](docs/invention-status-workflow.md)
- [docs/invention-submission-checklist.md](docs/invention-submission-checklist.md)
- [docs/invention-screening-logic.md](docs/invention-screening-logic.md)
- [docs/ip-strategy-decision-tree.md](docs/ip-strategy-decision-tree.md)
- [docs/company-disclosure-workflow.md](docs/company-disclosure-workflow.md)
- [docs/deal-pipeline-workflow.md](docs/deal-pipeline-workflow.md)
- [docs/repository-and-project-setup.md](docs/repository-and-project-setup.md)
- [docs/otomarket-reuse-notes.md](docs/otomarket-reuse-notes.md)

## 次に実装する候補

1. README / AGENTS 固定
2. API仕様docs
3. MVP data model docs
4. ER図 / UML docs
5. Next.js + Supabase 初期化

## 検証コマンド

- `git status --short`
- `git diff --check`

## コミット方針

- 変更内容を確認したうえでコミットする
- コミット前に必ず `git diff --check` を実行する
- 変更内容の監査性を保つため、検証結果を毎回確認する
