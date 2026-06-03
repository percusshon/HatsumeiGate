# Storage Policy Plan

## 1. 方針

- 原則 private bucket。
- signed URL は最短有効期限で配信し、表示/ダウンロードの都度監査ログ必須。
- 発明開示レベル（`level_0`~`level_4`）と N D A で同一ファイルの見せ方を制御。

## 2. bucket候補

- `invention-files`
  - 用途: 発明者がアップロードした図面・写真・PDF・動画・コード断片。
  - 原則 private。
- `company-disclosure-files`
  - 用途: NDA合意後に企業へ供与する補足資料（制限付き配信）。
  - private。
- `legal-documents`
  - 用途: 規約・テンプレート等の社内/法務資料。
  - private + 限定閲覧。
- `public-assets`
  - 用途: サービス内 UI 装飾、説明文の共通素材。
  - 原則 public、秘密情報は置かない。

## 3. public/private 境界

- `public-assets` は UI表示素材のみ。
- 発明本体・審査資料・交渉資料は `invention-files` / `company-disclosure-files` のみに置く。
- privateバケットからの直接 URL 公開はしない。

## 4. signed URL 有効期限方針

- ダッシュボード閲覧: 5〜15分。
- 面談用一時共有: 24時間以内（監査上最短有効）
- ダウンロード: 期限は短く、回数制限を API 側で併用。
- 長期保存用共有は許可しない。

## 5. download/view logging 方針

- 必須イベント:
  - 発明者アップロード
  - 発明者閲覧（自己）
  - 発明者削除
  - 企業閲覧/ダウンロード（`company_invention_views` 連携）
- ログ情報:
  - `user_id`, `company_id`, `invention_id`, `file_id`, `disclosure_level`, `viewed_at`, `ip`, `user_agent`, `result`。
- 失敗（権限不足/期限切れ）は拒否ログを残す。

## 6. 企業NDA前にファイルアクセス制御

- level_0/1: signed URL なし。表示も不可。
- level_2/3/4: NDA成立時のみ API 経由で発行。
- `invention_files.file_scope` が `none` / `internal_only` のものは企業への配布対象外。
- `company_invention_views` がなければ発行しない。

## 7. level_3 / level_4 のファイル開示制御

- level_3: 要点資料・概要図中心。編集可能なコア実装資料は不可。
- level_4: 交渉パッケージ資料のみ。価格条件や権利境界資料は監査付き。
- 両レベルとも
a) 同一ユーザーあたり同日DL回数上限
  b) 利用履歴を監査ログと紐付け

## 8. 発明者自身のファイル閲覧/削除

- 発明者本人: 自案件のファイル閲覧は可。
- 削除は公開化前提では可能でも、運営が重要情報を保持したい場合は論理削除/監査残存。
- 発明者権利帰属や共同発明者情報が変更される場合は削除不可フラグに切替える運用を検討。

## 9. 運営 / 弁理士 / 企業アクセス差

- 運営: 認証済みで案件担当ならメタ情報つき参照可。
- patent_attorney_partner: 運営承認案件の読み取り中心。生ファイル取得を避け、必要最小資料を再配布。
- 企業: NDAレベル条件を満たす場合のみ。`company_legal_reviewer` は契約・条件資料中心。

## 10. 将来拡張

- ウイルスチェック: アップロード時に非同期スキャン（設計提案: `docs/virus-scan-proposal.md`、未着手）。
- 透かし: 画像/PDF の公開版を表示時透かし（社名+閲覧日時）。
- アクセス回数制限: 月次/案件単位のレート制限。
- 期限付き自動失効: 開示停止/競合制約で bucket path の無効化。

## 11. 未決事項

- bucketの階層設計（`/invention/{id}/raw` か `/invention/{id}/public`）。
- `public-assets` に含める説明素材の機密性判定。
- 透かし方式（画像とPDFの共通化）
