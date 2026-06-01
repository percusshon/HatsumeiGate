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

- 業務ロジック docs を source of truth として実装進行中
- Next.js (App Router) + Supabase 導入済み
- 実装済み: Supabase スキーマ/RLS/storage/seed、Magic Link 認証、inventor 下書き〜提出、発明者の進捗可視・開示同意、operator 内部審査（ステータス遷移 / 審査レポート / 先行技術 / 知財方針）、operator 企業審査・開示申請レビュー・取引パイプライン、企業ポータル（NDA同意 / 開示申請作成）、企業向けゲート付き開示ビュー（service_role API + 閲覧ログ）
- 開示の happy path が一周: 企業申請 → 発明者同意 → 運営承認（NDA/レベルゲート）→ ゲート付き開示閲覧（ログ）→ 取引管理
- 未実装: 企業向けティザー一覧（発明の discovery）、取引の新規作成（RLS insert 未整備）、ファイル/signed URL、audit_logs 連動（`docs/implementation-roadmap.md` と各 `docs/*-mvp.md` 参照）

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

1. 企業向けティザー一覧（企業が申請可能な発明の discovery）
2. 取引（deal）の新規作成（`deal_pipeline` の insert RLS ポリシー設計）
3. ファイルアップロード + signed URL（開示レベル連動・透かし・ダウンロード制御）
4. audit_logs への横断的記録（Phase 12）
5. 通知連携（同意・承認・面談・成立イベント）

## 検証コマンド

- `git status --short`
- `git diff --check`

## コミット方針

- 変更内容を確認したうえでコミットする
- コミット前に必ず `git diff --check` を実行する
- 変更内容の監査性を保つため、検証結果を毎回確認する
