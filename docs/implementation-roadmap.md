# Implementation Roadmap

## 目的

Hatsumei Gate の実装を、業務ロジック整合性（秘密情報保護・非公開・NDA前後分離・開示管理）を壊さない順序で進める。

## フェーズ一覧

### Phase 0: docs foundation 完了

- 目的: 業務ルールと主要設計docsの整合を固定し、実装前の認識を固定する。
- 成果物: README/AGENTS、業務ロジックdocs、データモデル/API/RLS/監査設計、図解docs。
- 完了条件: 既存docsの主要ステータス・開示境界・権限境界が矛盾なく参照可能。
- 検証: `git status --short`, `git diff --check`（変更なし）
- 後戻り条件: 重要ワークフローの定義不一致（ステータス遷移、開示レベル、権限）が見つかった場合。

### Phase 1: migration planning

- 目的: Supabase migrationを壊れにくく分割する順序を確定。
- 成果物: `docs/migration-planning-notes.md`, マイグレーション依存順一覧。
- 完了条件: テーブル/Enum/制約/INDEX/SOFT DELETE の順序と「未決事項」登録。
- 検証: FK循環、必須項目の分離、`organizations` と `company_accounts` の暫定方針合意。
- 後戻り条件: 外部鍵依存関係が確定できない場合や法務的に危険な開示ルールがあれば戻る。

### Phase 2: Supabase schema draft

- 目的: MVPで最小限必要なテーブルを定義。
- 成果物: `docs/supabase-schema-implementation-plan.md` の実装順（DDL雛形は未作成）。
- 完了条件: users/invention/company/deal/auditの主系列が一貫する状態。
- 検証: 参照関係、status/eventの履歴テーブル、監査キー設計。
- 後戻り条件: 履歴/監査要件に不足がある場合。

### Phase 3: RLS policy draft

- 目的: 機密情報を先に守る最小RLSを確定。
- 成果物: `docs/rls-implementation-plan.md`
- 完了条件: inventor/operator/company/admin/patent_partner別のアクセス境界が明文化。
- 検証: 「閲覧ログなしで詳細返却しない原則」をRLSかAPIガードに割当。
- 後戻り条件: 監査要件を満たせないポリシーが発生。

### Phase 4: Storage policy draft

- 目的: private file中心のアクセス制御設計。
- 成果物: `docs/storage-policy-plan.md`
- 完了条件: signed URL有効期限・開示レベル・NDA状態を満たす参照仕様。
- 検証: NDA前にlevel_3/4が開示されない設計。
- 後戻り条件: 法務同意情報とbucket方針が不一致な場合。

### Phase 5: seed data / roles

- 目的: 開発・検証で必要なロール/権限・最低限サンプルを用意。
- 成果物: `docs/seed-data-and-roles.md`
- 完了条件: 主要role/permission、テストユーザー、サンプル案件が定義。
- 検証: シードが秘密情報を含まない。
- 後戻り条件: NDA/開示ロジックと矛盾するロール設計。

### Phase 6: Next.js app initialization

- 目的: 実装基盤を起動し、Auth/DB client/RPC境界を接続可能な構成。
- 成果物: 初期セットアップ計画（実装時）。
- 完了条件: Next.js + Supabase接続設計がドキュメントどおり。
- 検証: `docs/mvp-validation-checklist` の実行観点が満たしやすい構造。
- 後戻り条件: RLS・storage方針に合わせて初期構成を変更。

### Phase 7: auth/profile/role base

- 目的: 認証基盤 + `users_profile` + role claim同期を先に立ち上げる。
- 成果物: プロファイル同期ルール、role seed反映手順。
- 完了条件: inventor/operator/company系のログイン後ユーザを正しく識別できる。
- 検証: 無権限APIで403。
- 後戻り条件: 企業利用者と個人利用者を区別できない場合。

### Phase 8: inventor draft/submission MVP

- 目的: 下書き保存から提出までの発明者体験を実装。
- 成果物: 発明登録/更新/提出API + form + ステータス表示。
- 完了条件: submitted時点で投稿前チェックの必須フローへ移行。
- 検証: ステータス遷移図の一致、入力必須項目。
- 後戻り条件: 企業露出が初期登録時点で混入。

### Phase 9: operator status/review MVP

- 目的: 運営審査（screening→prior_art→ip_strategy）を回せる状態。
- 成果物: status update/診断スコア/先行技術ノート機能。
- 完了条件: ステータス遷移不正が防止される。
- 検証: `docs/invention-state-machine.md` 準拠。
- 後戻り条件: 不正遷移時ログが足りない。

### Phase 10: screening report MVP

- 目的: 診断レポート、先行技術メモ、知財方針ノートの保存。
- 成果物: 審査入力UI/API + 管理者向け内部メモ。
- 完了条件: 発明者向け要約と内部向け詳細の表示分離。
- 検証: 外部表示に禁止情報が混入しない。
- 後戻り条件: レポートが同時に開示領域へ流出。

### Phase 11: company account / NDA / disclosure MVP

- 目的: 招待制企業閲覧を導入し、NDA前後で表示を分離。
- 成果物: 企業アカウント、NDA同意、開示リクエスト、閲覧ログ。
- 完了条件: 競合制御を含め、level_0〜4で閲覧差分が担保。
- 検証: `level_2/3/4` の境界テスト。
- 後戻り条件: level_3でファイルが漏洩。

### Phase 12: audit log verification

- 目的: 監査イベントがイベント種別ごとに記録される状態。
- 成果物: 監査ログ記録パス（APIとサービス処理）と閲覧ポリシー。
- 完了条件: 重要操作100%が監査対象化。
- 検証: 機密値の本文埋め込み有無、保持期間ルール。
- 後戻り条件: 書き込み失敗時でも主要イベントが欠落。

### Phase 13: deal pipeline MVP

- 目的: 企業交渉状態をdeal単位で追跡。
- 成果物: deal作成/遷移/通知、条項スナップショット。
- 完了条件: 取引成立/不成立イベントが分離。
- 検証: 成功報酬イベントと通知タイミング。
- 後戻り条件: 契約条件と実体が不整合。

### Phase 14: payment/revenue events later

- 目的: 成功報酬・ロイヤリティの計測を実運用に接続。
- 成果物: revenue_eventsの最小要件拡張。
- 完了条件: 監査ログ連動で収益イベントを記録。
- 検証: 契約成立イベントと収益イベントの整合。
- 後戻り条件: 法務条項の確定前に報酬実装。

## 実装順序の全体方針

1. Schema → RLS → Storage → Seedの順で作る。
2. その後に inventor系機能、次に operator系、次に企業連携、最後に dealを追加。
3. 監査・validationは `Phase 12` へまとめず、各フェーズで横断的に同時実装。

## 実装の停止・戻しトリガー

- 「秘密情報」「閲覧ログ」「NDAゲート」を1つでも欠ける実装は停止。
- 法的表現で誤認を起こしうる表示が混入した場合は停止。
- OtoMarketの販売モデル（購入/ダウンロード/公開販売）UIを混入させない。

## 未決事項

- `organizations` と `company_accounts` の統合か分離か。
- 取引成立時のイベントをどこまで audit log と revenueイベントで重複記録するか。
- 企業向け同意文面の厳密版は法務レビュー後に確定。
