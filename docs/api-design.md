# API設計（MVP）

> Next.js / Supabase 実装前のドラフト。実装しない。

## 1. 設計方針

- 基本: REST設計（`/api/v1`）
- 認証: Supabase Auth を前提に JWT を検証
- 運営と企業・発明者向けUI差分をAPI側で明示制御
- ステータス変更は「必ず検証 + 監査ログ + 通知イベント」を同時実行
- 例外や開示制御で失敗した場合は、情報を返さず403/409を返す
- 全ての機密レスポンスは、画面に必要最小限のフィールドのみ返却

---

## 2. 認証前/認証後の境界

### 認証前
- 将来の実装では、認証ページ（サインアップ/ログイン）は認証基盤に委譲
- APIとして公開する機能は原則なし（MVPでは認証必須）
- 公開ヘルスチェックと仕様書取得のみ許可可（本体ロジック参照なし）

### 認証後
- すべての業務系APIを保護
- `Authorization: Bearer`（Supabase JWT）必須
- セッション無効、NDA期限切れ、権限不足時はアクセス拒否

---

## 3. 共通エラー方針

| HTTP | 意味 | 主な原因 |
|---|---|---|
| 400 | Bad Request | 入力不備、型不正 |
| 401 | Unauthorized | 認証未設定、期限切れ |
| 403 | Forbidden | 権限不足、NDA未成立、企業競合制約 |
| 404 | Not Found | ID未存在または非開示対象 |
| 409 | Conflict | ステータス遷移不正、同一処理の二重申請 |
| 412 | Precondition Failed | 同意未完了・必要チェック未通過 |
| 422 | Unprocessable Entity | 業務ルール違反（保証表現・禁止操作） |
| 500 | Internal Error | サーバーエラー |

---

## 4. エラー共通レスポンス

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "運営側が許可する遷移ではありません",
    "details": { "from": "submitted", "to": "licensed" }
  }
}
```

- エラー時も `request_id` を返し、監査ログ連携可能にする。

---

## 5. inventor向けAPI

### 5.1 invention draft 作成
- `POST /api/v1/inventions`
- 目的: 下書き保存
- 入力:
  - title, problem_statement, dissatisfaction, mechanism, target_users, use_scene, existing_similar_products, has_prototype, desired_outcomes
- 出力:
  - `invention_id`, `status=draft`, `created_at`
- 権限: `inventor`
- 監査: `invention_created`

### 5.2 invention draft 更新
- `PATCH /api/v1/inventions/{id}`
- 目的: draft更新
- 入力: 登録必須項目の部分更新
- 出力: 更新後の発明要約
- 権限: `inventor`（自分の案件のみ）
- 監査: `invention_updated`

### 5.3 invention submit
- `POST /api/v1/inventions/{id}/submit`
- 目的: draft→submitted
- 入力: `submission_check_id`（任意）または同時保存
- 出力: `submitted_at`, `next_action`
- 権限: `inventor`（自分の案件）
- 監査: `invention_status_changed`, `submission_accepted`

### 5.4 submission checks 保存
- `POST /api/v1/inventions/{id}/submission-checks`
- 目的: 投稿前チェック記録
- 入力: 同意項目フラグ、公開履歴、共同発明、権利帰属、第三者素材、開示分離可否
- 出力: チェック結果（passed/need_correction）
- 権限: `inventor`, `operator`（補完）
- 監査: `submission_check_saved`

### 5.5 invention status 取得
- `GET /api/v1/inventions/{id}/status`
- 目的: ステータス履歴と表示文言取得
- 出力: 現在ステータス、表示文言、次アクション
- 権限: `inventor`, `operator`, `admin`
- 監査: 閲覧ログ（発明者は自身のみ）

### 5.6 invention files upload/list/download
- `POST /api/v1/inventions/{id}/files`
  - 目的: ファイルアップロード（図面/写真/PDF/動画/コード）
  - 権限: `inventor`（自分） / `operator`（レビュー補助）
  - 出力: file_id, scope, upload_state
  - 監査: `file_uploaded`
- `GET /api/v1/inventions/{id}/files`
  - 目的: 自分案件の添付一覧
- `GET /api/v1/inventions/{id}/files/{fileId}/download`
  - 目的: signed URL発行（短時間）
  - 権限: `inventor`（自分） / `operator` / 承認済み企業ロール + 条件付き
  - 監査: `file_downloaded`

---

## 6. operator/reviewer向けAPI

### 6.1 operator status update
- `POST /api/v1/inventions/{id}/status`
- 目的: 監査前提の状態遷移
- 入力: `to_status`, `reason_code`, `required_input`
- 出力: 新ステータス、承認ルール評価
- 権限: `operator`, `reviewer`
- 監査: `status_changed`（必須）

### 6.2 screening report 作成/更新
- `POST /api/v1/inventions/{id}/screening-reports`
- `PUT /api/v1/screening-reports/{id}`
- 目的: 一次診断文言/判断（A-E）作成・修正
- 入力: summary, strengths, risks, recommended_actions, decision, expires_at
- 出力: レポートID/版数
- 権限: `operator`, `reviewer`
- 監査: `screening_report_created/updated`

### 6.3 prior art item 管理
- `POST /api/v1/inventions/{id}/prior-art-items`
- `PATCH /api/v1/prior-art-items/{id}`
- `DELETE /api/v1/prior-art-items/{id}`
- 目的: 先行技術メモの登録・更新・削除
- 権限: `operator`, `reviewer`
- 監査: `prior_art_item_mutated`

### 6.4 ip strategy note 管理
- `POST /api/v1/inventions/{id}/ip-strategy-notes`
- `PUT /api/v1/ip-strategy-notes/{id}`
- 目的: 知財方針の暫定整理
- 入力: strategy, alternative_strategies, rationale, attorney_review_required, lawyer_review_required
- 権限: `operator`, `reviewer`
- 監査: `ip_strategy_updated`

### 6.5 company account review
- `GET /api/v1/admin/companies/{id}`
- `POST /api/v1/admin/companies/{id}/review`
- 目的: 企業アカウントの承認/凍結
- 入力: `review_state`, `reason`
- 権限: `admin` / `operator`
- 監査: `company_account_reviewed`

---

## 7. company関連API（company_user / company_admin / company_legal_reviewer）

### 7.1 disclosure request
- `POST /api/v1/company/disclosure-requests`
- 目的: 企業側が開示申請
- 入力: invention_id, target_level, request_reason
- 出力: request_id, status
- 権限: `company_user`, `company_admin`, `company_legal_reviewer`
- 監査: `disclosure_requested`

### 7.2 company account review（社内表示）
- `GET /api/v1/company/account/me`
- 目的: 企業アカウント状態、NDA未了タスク確認
- 権限: 企業3ロール
- 監査: 任意で `account_info_accessed`

### 7.3 NDA acceptance
- `POST /api/v1/company/nda-acceptances`
- 目的: NDA同意履歴保存
- 入力: company_id, invention_id, deal_id（任意）, disclosure_level, agreement_version
- 出力: nda_acceptance_id, effective期間
- 権限: 企業承認者
- 監査: `nda_accepted`

### 7.4 company invention view（NDA前後制御）
- `GET /api/v1/company/inventions/{id}`
- 目的: 企業向け案件閲覧（表示レベルに応じたフィールド制御）
- 出力: レベル別に制御されたデータ（レベル1は課題要約中心）
- 権限: `company_user`以上
- 監査: `company_invention_viewed`（レベル付き）

### 7.5 company disclosure file download
- `GET /api/v1/company/inventions/{id}/files/{fileId}/download`
- 目的: NDA/許諾レベルに応じたファイルダウンロードURL発行
- 出力: 1時間有効signed URL
- 権限: `company_admin`, `company_legal_reviewer`（条件付き）
- 監査: `file_downloaded`

---

## 8. deal pipeline API

### 8.1 deal pipeline update
- `POST /api/v1/deals`
- 目的: 企業/運営/発明者による交渉レコード作成
- 入力: invention_id, company_id, deal_type, status
- 出力: deal_id
- 権限: `company_admin`, `operator`, `admin`, `inventor`（条件付き）
- 監査: `deal_created`

### 8.2 deal status update
- `POST /api/v1/deals/{id}/status`
- 目的: 取引ステータス遷移
- 入力: to_status, reason_code, terms_snapshot
- 出力: 更新後ステータス
- 権限: `operator`, `company_admin`, `company_user`, `admin`, `inventor`（業務ルールに従う）
- 監査: `deal_status_changed`

### 8.3 success fee / revenue event
- `POST /api/v1/deals/{id}/revenue-events`
- 目的: 契約成立・実績発生イベント
- 入力: event_type, amount, currency, schedule
- 権限: `admin`, `operator`
- 監査: `revenue_event_recorded`

---

## 9. admin向けAPI

### 9.1 audit log read
- `GET /api/v1/admin/audit-logs`
- 目的: 監査ログ参照
- 入力: entity_type, entity_id, from, to, actor_role, action
- 出力: 監査イベント配列 + pagination
- 権限: `admin` のみ
- 監査: 読み取りログは監査の対象外（必要なら別ロギング）

### 9.2 運営用インベントリAPI
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/inventions`
- 目的: 担当別案件把握、遅延アラート
- 権限: `admin`, `operator`
- 監査: `admin_dashboard_accessed`

---

## 10. NDA前/後の開示制御（APIルール）

- `inventions` の表示は `disclosure_level` と `disclosure_request.status` + `nda_acceptances.status` を満たした場合のみ拡張。
- level_1では要約・課題・効果（数値なし）を返す。
- level_2では構成図レベル要約と適用条件（高レベル）を返す。
- level_3/4では詳細が必要だが、`nda_accepted` かつ有効期限内、かつ閲覧者が該当申請に紐づく場合のみ返す。
- 禁止事項違反時は `403` + 「閲覧制限」に統一。

---

## 11. ファイルアクセスAPIの注意点

- file APIは直接保存パスを返さない。
- 署名URLは 10〜30分TTL を想定（開示レベルに応じ調整）。
- 同時に `company_invention_views` を確実に追加記録。
- 試行やダウンロード拒否は `download_denied` ログ。
- `level_4` のみ、必要ならダウンロード回数上限チェック。
