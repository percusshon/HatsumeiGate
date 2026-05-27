# 監査ログ設計（MVP）

## 1. 監査ログの目的

- 誰が、いつ、どこから、どの対象を、どの根拠で操作したかを再現可能にする。
- NDA前後の開示制御違反を防ぐため、企業開示イベントを追跡する。
- 取引成立/不成立、ステータス変更、ファイル閲覧、契約条件差分を監査可能にする。

---

## 2. `audit_logs` テーブル案

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `event_at` | timestamptz | ◯ | 発生時刻 |
| `event_type` | text | ◯ | イベント種別 |
| `event_action` | event_action | ◯ | 作成/更新/閲覧など |
| `actor_user_id` | uuid | △ | 実行ユーザー |
| `actor_role` | role | ◯ | 実行ロール |
| `actor_org_id` | uuid | △ | 所属組織 |
| `target_type` | text | ◯ | `invention` / `company` / `deal` / `file` |
| `target_id` | uuid | ◯ | 対象ID |
| `related_invention_id` | uuid | △ | 発明ID |
| `related_company_id` | uuid | △ | 企業ID |
| `from_status` | text | △ | 遷移前 |
| `to_status` | text | △ | 遷移後 |
| `status_reason` | text | △ | 遷移理由 |
| `before_hash` | text | △ | 前状態のハッシュ（監査拡張） |
| `after_hash` | text | △ | 後状態のハッシュ |
| `metadata` | jsonb | △ | 非機密の補助情報 |
| `disclosure_level` | disclosure_level | △ | 閲覧時レベル |
| `consent_id` | uuid | △ | NDA/同意ID |
| `request_id` | text | ◯ | APIリクエスト識別子 |
| `ip` | inet | △ | クライアントIP |
| `user_agent` | text | △ | UA |
| `created_at` | timestamptz | ◯ | 作成日時 |

---

## 3. ログ対象イベント（カテゴリ）

- `invention_submit`
- `invention_update`
- `invention_status_changed`
- `submission_check_saved`
- `file_uploaded`
- `file_viewed`
- `file_downloaded`
- `screening_report_saved`
- `prior_art_item_updated`
- `ip_strategy_note_updated`
- `company_disclosure_request`
- `nda_requested`
- `nda_accepted`
- `company_invention_viewed`
- `deal_status_changed`
- `deal_terms_updated`
- `revenue_recorded`
- `admin_action`

---

## 4. イベント別の記録項目（要求事項）

### 4.1 発明投稿/変更
- invention_id、actor、ステータス、前後差分キー、同意ID
- 必要があれば下書きから提出への遷移

### 4.2 ステータス変更
- from/to、遷移者、理由、参照ルール、遷移前条件結果
- 監査上重要な理由コード

### 4.3 投稿前チェック同意
- 各同意項目のフラグ（合否）
- 欠損チェック結果

### 4.4 ファイルアップロード/閲覧/ダウンロード
- file_id, bucket_path hash, scope
- 閲覧者、端末、セッション、許可レベル

### 4.5 診断レポート作成/変更
- report_id, decision(A-E), operator,
- 主要スコア平均値

### 4.6 先行技術メモ作成/変更
- prior_art_item_id, source_ref, similarity_level, 差分要約

### 4.7 知財方針メモ作成/変更
- ip_strategy_notes.id, 戦略候補、再設計要否

### 4.8 NDA同意
- 対象会社、対象発明、レベル、有効期限、同意版

### 4.9 企業開示リクエスト
- request_id, target_level, company_id, status
- operator決裁結果

### 4.10 企業閲覧
- view_id, disclosure_level, file/page, duration
- レベル不足拒否の場合は `file_download_denied` を記録

### 4.11 取引ステータス変更
- deal_id, from/to、条件変更差分、法務確認フラグ

### 4.12 成功報酬イベント
- 取引ID、イベント種別、確定金額、決済日、通知状態

### 4.13 管理者操作
- 利用者権限変更、アカウント停止、監査ログ閲覧、会社承認

---

## 5. ログに保存してよい情報/してはいけない情報

### 保存してよい
- actor id（内部ID）
- ロール
- timestamp/request_id/entity_type/entity_id
- status transition / decision code / event type
- hash（IP情報の要約）

### 保存してはいけない
- 本文全文の長文添付（IP内容のコア）
- 連絡先（住所・電話・個人名の生データ）
- 企業との非公開価格交渉の詳細条件（要約キーのみ）
- 画像・図面の全文バイナリ

---

## 6. ログ本文に情報を詰めすぎない方針

- `metadata` は最小構造。
- 秘匿値はID/ハッシュ化して保存（例: `agreement_id_hash`）。
- 監査は再調査可能性を担保するが、ログ自体が再流出の起点にならないよう設計。

---

## 7. 保持期間（暫定）

- 運営監査: 7年（運用保守に応じて見直し）
- 取引関連（deal/revenue）: 契約履歴と同期間。最低7年
- 失効したNDA同意: 法的要件に応じ保持後にアーカイブ
- Rawアクセスログ（画面）: 1年 + 要件に応じて監査アーカイブ

---

## 8. 将来のエクスポート / 証跡対応

- 監査エクスポート用 `report_type` を追加し、法務取得に耐えるCSV/JSON出力を想定。
- 監査証跡の改ざん検知のため `prev_hash` / `event_hash` を将来追加可能。
- 出力時はPII最小化（IDだけ残し、必要ならマッピング表は別管理）。

---

## 9. 実装前の注意

- ログは「見えてよい情報」と「見せるための情報」を分離。
- 監査画面自体にも閲覧権限をかける。
- `audit_logs` 書き込み失敗を検知した場合は、業務系APIは原則ロールバック。
