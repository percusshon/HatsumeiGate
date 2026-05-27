# MVPデータモデル設計（将来Supabase接続想定）

## 1. 前提

本設計はMVP段階での業務実装（Next.js + Supabase）に接続しやすいよう、既存の業務ロジックdocsをデータ構造へ落とし込んだものです。

- 非公開・審査制
- NDA前後で開示レベル分離
- 発明情報は秘密情報扱い
- 企業閲覧は権限/開示レベル/ログ条件を必須化
- 運営は最終法的判断（弁理士業務・特許庁手続代理）を行わない

---

## 2. MVP必須エンティティ一覧

- `users_profile`
- `organizations`
- `organization_members`
- `inventions`
- `invention_files`
- `invention_status_events`
- `invention_submission_checks`
- `invention_screening_reports`
- `invention_screening_scores`
- `prior_art_items`
- `ip_strategy_notes`
- `company_accounts`
- `company_members`
- `nda_acceptances`
- `company_disclosure_requests`
- `company_invention_views`
- `deal_pipeline`
- `deal_status_events`
- `revenue_events`
- `audit_logs`

---

## 3. Enum候補（MVP）

### 3.1 invention_status
- `draft`
- `submitted`
- `screening`
- `needs_more_info`
- `prior_art_research`
- `ip_strategy_review`
- `prototype_review`
- `attorney_review_ready`
- `company_disclosure_ready`
- `company_reviewing`
- `negotiating`
- `licensed`
- `assigned`
- `joint_development`
- `rejected`
- `withdrawn`
- `archived`

### 3.2 disclosure_level
- `level_0_internal_only`
- `level_1_company_teaser`
- `level_2_nda_summary`
- `level_3_nda_detail`
- `level_4_negotiation_package`

### 3.3 deal_status
- `no_interest`
- `interested`
- `nda_requested`
- `nda_accepted`
- `meeting_requested`
- `meeting_completed`
- `evaluating`
- `terms_proposed`
- `negotiating`
- `licensed`
- `assigned`
- `joint_development`
- `declined`
- `closed`

### 3.4 ip_strategy
- `patent`
- `utility_model`
- `design_right`
- `trademark`
- `copyright`
- `trade_secret`
- `open_source`
- `defensive_publication`
- `no_ip_action`
- `redesign_required`

### 3.5 file_scope
- `none`
- `internal_only`
- `teaser`
- `nda_summary`
- `nda_detail`
- `negotiation_package`

### 3.6 event_action
- `created`
- `updated`
- `submitted`
- `status_changed`
- `viewed`
- `downloaded`
- `download_denied`
- `nda_requested`
- `nda_accepted`
- `disclosed`
- `deal_updated`
- `deal_term_updated`

### 3.7 role
- `inventor`
- `operator`
- `reviewer`
- `patent_attorney_partner`
- `company_user`
- `company_admin`
- `company_legal_reviewer`
- `admin`

---

## 4. テーブル定義（MVP）

### 4.1 `users_profile`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK。`auth.users.id` と連携（将来Supabase連携前提） |
| `email` | text | ◯ | 参照用。必要時はauthと同期 |
| `display_name` | text | ◯ | 表示名 |
| `role` | role | ◯ | ロール（enum） |
| `organization_id` | uuid | △ | 所属組織。会社担当者等で使用 |
| `is_active` | boolean | ◯ | 利用可否 |
| `last_login_at` | timestamptz | △ | 最終ログイン |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.2 `organizations`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `name` | text | ◯ | 法人格名/名称 |
| `type` | text | ◯ | `company`, `partner`, `internal` |
| `slug` | text | △ | URL表示用 |
| `country` | text | △ | 国 |
| `industry` | text[] | △ | 業種タグ |
| `is_active` | boolean | ◯ | 有効フラグ |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.3 `organization_members`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `organization_id` | uuid | ◯ | FK -> organizations.id |
| `user_id` | uuid | ◯ | FK -> users_profile.id |
| `member_role` | text | ◯ | `company_user` / `company_admin` / `company_legal_reviewer` |
| `is_owner` | boolean | ◯ | 代表者フラグ |
| `status` | text | ◯ | invited / active / suspended |
| `invited_at` | timestamptz | △ | 招待日時 |
| `accepted_at` | timestamptz | △ | 承認日時 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.4 `inventions`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `owner_id` | uuid | ◯ | 発明者（FK -> users_profile.id） |
| `title` | text | ◯ | 発明タイトル |
| `problem_statement` | text | ◯ | 解決したい課題 |
| `dissatisfaction` | text | ◯ | 既存品/既存サービスの不満 |
| `mechanism` | text | ◯ | 発明の仕組み |
| `target_users` | text[] | ◯ | 想定ユーザー |
| `use_scene` | text | ◯ | 使用シーン |
| `existing_similar_products` | text | ◯ | 似ている既存製品/サービス |
| `has_prototype` | boolean | ◯ | 試作品の有無 |
| `desired_outcomes` | text[] | ◯ | 希望する出口（複数） |
| `submission_status` | invention_status | ◯ | 現在の案件ステータス |
| `disclosure_level` | disclosure_level | ◯ | 現在表示可能レベル |
| `is_public_info` | boolean | ◯ | すでに公開済みか |
| `co_inventor_exists` | boolean | ◯ | 共同発明者の有無 |
| `ownership_risk_flag` | boolean | ◯ | 勤務先/委託先/学校の権利帰属リスク |
| `third_party_content_risk` | boolean | ◯ | 他人資産混入リスク |
| `nda_pre_summary_ready` | boolean | ◯ | NDA前に見せる要約の準備可否 |
| `assigned_operator_id` | uuid | △ | 運営の担当者 |
| `screening_decision` | text | △ | A〜E |
| `current_disclosure_notes` | text | △ | 開示メモ（要約） |
| `finalized_for_ip_partner` | boolean | △ | 弁理士相談準備完了 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.5 `invention_files`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `uploaded_by` | uuid | ◯ | FK -> users_profile.id |
| `file_name` | text | ◯ | 元ファイル名 |
| `storage_bucket` | text | ◯ | Supabase Storage bucket |
| `storage_path` | text | ◯ | private保存パス |
| `mime_type` | text | ◯ | MIME |
| `size_bytes` | bigint | ◯ | ファイルサイズ |
| `sha256` | text | ◯ | 同一性チェック |
| `file_scope` | file_scope | ◯ | 開示可能レベル |
| `is_deleted` | boolean | ◯ | 論理削除 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.6 `invention_status_events`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `from_status` | invention_status | △ | 変更前 |
| `to_status` | invention_status | ◯ | 変更後 |
| `actor_id` | uuid | ◯ | 実行者 |
| `actor_role` | role | ◯ | 実行ロール |
| `reason_code` | text | ◯ | 遷移理由 |
| `notes` | text | △ | 補足 |
| `required_input` | jsonb | △ | 遷移に必要だった入力要約 |
| `ip_block_level_after` | disclosure_level | △ | 開示レベル変更時 |
| `created_at` | timestamptz | ◯ | 更新日時 |

---

### 4.7 `invention_submission_checks`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `is_inventor_self` | boolean | ◯ | 自分が発明者か |
| `has_co_inventor` | boolean | ◯ | 共同発明者の有無 |
| `ownership_risk_description` | text | △ | 権利帰属リスク要因 |
| `already_public` | boolean | ◯ | SNS/公開履歴の有無 |
| `public_channels` | text[] | △ | 公開チャネル |
| `third_party_content_used` | boolean | ◯ | 他者素材混入 |
| `third_party_details` | text | △ | 使用範囲 |
| `summary_for_company_pre_nda_ok` | boolean | ◯ | NDA前要約があるか |
| `can_split_disclosure` | boolean | ◯ | NDA前/後で分離できるか |
| `check_status` | text | ◯ | pending / passed / need_correction |
| `agreement_snapshot` | jsonb | ◯ | 同意文言同意情報 |
| `operator_remarks` | text | △ | 運営コメント |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.8 `invention_screening_reports`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `operator_id` | uuid | ◯ | 運営担当 |
| `decision` | text | ◯ | A/B/C/D/E |
| `summary` | text | ◯ | 要約説明 |
| `strengths` | text[] | △ | 強み |
| `risks` | text[] | △ | リスク |
| `recommended_actions` | text[] | ◯ | 次アクション |
| `expires_at` | timestamptz | △ | 更新期限 |
| `version` | integer | ◯ | 版数 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.9 `invention_screening_scores`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `report_id` | uuid | ◯ | FK -> invention_screening_reports.id |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `axis` | text | ◯ | 評価軸 |
| `score` | smallint | ◯ | 0〜5 |
| `high_conditions` | text | △ | 高評価条件 |
| `low_conditions` | text | △ | 低評価条件 |
| `needs_more_input` | text | △ | 追加質問 |
| `reject_condition_hit` | boolean | ◯ | 不採用条件ヒット |
| `created_by` | uuid | △ | 記録者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.10 `prior_art_items`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `screening_report_id` | uuid | △ | 参照レポート |
| `source_kind` | text | ◯ | patent / publication / product / archive |
| `source_ref` | text | ◯ | 特許番号/URL |
| `title` | text | ◯ | 先行例タイトル |
| `summary` | text | ◯ | 要点 |
| `similarity_level` | smallint | ◯ | 類似度 |
| `difference_summary` | text | ◯ | 差分 |
| `risk_note` | text | △ | 影響 |
| `created_by` | uuid | △ | 作成者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.11 `ip_strategy_notes`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `strategy` | ip_strategy | ◯ | 主提案 |
| `alternative_strategies` | ip_strategy[] | △ | 補助候補 |
| `strategy_rationale` | text | ◯ | 分岐理由 |
| `attorney_review_required` | boolean | ◯ | 弁理士確認要否 |
| `lawyer_review_required` | boolean | ◯ | 弁護士確認要否 |
| `finalized` | boolean | ◯ | 提示確定か |
| `notes` | text | △ | 詳細メモ |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.12 `company_accounts`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `name` | text | ◯ | 会社名 |
| `code` | text | △ | 社内管理コード |
| `industry` | text[] | △ | 業界 |
| `country` | text | ◯ | 国 |
| `contact_email` | text | ◯ | 主要窓口 |
| `status` | text | ◯ | pending / active / suspended |
| `nda_template_version` | text | △ | 現在採用NDA雛形 |
| `review_state` | text | ◯ | account_reviewed |
| `reviewed_by` | uuid | △ | 審査担当 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.13 `company_members`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `company_id` | uuid | ◯ | FK -> company_accounts.id |
| `user_id` | uuid | ◯ | FK -> users_profile.id |
| `member_role` | role | ◯ | company_user / company_admin / company_legal_reviewer |
| `is_primary_contact` | boolean | ◯ | 担当窓口 |
| `status` | text | ◯ | invited / active / inactive |
| `invited_at` | timestamptz | △ | 招待日時 |
| `accepted_at` | timestamptz | △ | 承認日時 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.14 `nda_acceptances`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `company_id` | uuid | ◯ | FK -> company_accounts.id |
| `user_id` | uuid | ◯ | NDA同意者 |
| `invention_id` | uuid | △ | 発明単位NDA（必要時） |
| `deal_pipeline_id` | uuid | △ | 取引単位NDA（必要時） |
| `disclosure_level` | disclosure_level | ◯ | 適用レベル |
| `status` | text | ◯ | requested / accepted / revoked / expired |
| `agreement_version` | text | ◯ | 同意条文版 |
| `agreed_at` | timestamptz | △ | 同意日時 |
| `expires_at` | timestamptz | △ | 有効期限 |
| `ip_hash` | text | ◯ | 本文ハッシュ |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |

---

### 4.15 `company_disclosure_requests`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `company_id` | uuid | ◯ | FK -> company_accounts.id |
| `requester_id` | uuid | ◯ | 申請者 |
| `target_level` | disclosure_level | ◯ | 希望開示レベル |
| `status` | text | ◯ | requested / approved / denied / withdrawn |
| `operator_reviewed_by` | uuid | △ | 運営審査者 |
| `approved_level` | disclosure_level | △ | 実施レベル |
| `competing_block` | boolean | ◯ | 競合開示制約 |
| `disclosure_reason` | text | △ | 開示目的 |
| `expires_at` | timestamptz | △ | 開示期限 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.16 `company_invention_views`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `company_id` | uuid | ◯ | FK -> company_accounts.id |
| `user_id` | uuid | ◯ | 閲覧者 |
| `disclosure_request_id` | uuid | ◯ | 根拠リクエスト |
| `disclosure_level` | disclosure_level | ◯ | 実際の閲覧レベル |
| `viewed_file_id` | uuid | △ | ファイル単位閲覧 |
| `view_type` | text | ◯ | page / file / summary |
| `ip` | inet | ◯ | 端末IP |
| `user_agent` | text | △ | UserAgent |
| `session_id` | uuid | △ | セッション |
| `created_at` | timestamptz | ◯ | 閲覧日時 |

---

### 4.17 `deal_pipeline`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `company_id` | uuid | ◯ | FK -> company_accounts.id |
| `disclosure_request_id` | uuid | △ | 元となる開示リクエスト |
| `company_admin_id` | uuid | △ | 企業窓口 |
| `deal_type` | text | △ | transfer / license_exclusive / license_non_exclusive / joint_development / poc / option |
| `status` | deal_status | ◯ | 交渉ステータス |
| `terms_snapshot` | jsonb | △ | 価格・契約条件の現状 |
| `next_action_owner` | role | △ | 次アクション担当 |
| `closed_at` | timestamptz | △ | 終了時刻 |
| `result_reason` | text | △ | declined / closed の理由 |
| `created_by` | uuid | △ | 作成者 |
| `updated_by` | uuid | △ | 更新者 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |
| `deleted_at` | timestamptz | △ | 論理削除 |

---

### 4.18 `deal_status_events`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `deal_id` | uuid | ◯ | FK -> deal_pipeline.id |
| `from_status` | deal_status | △ | 変更前 |
| `to_status` | deal_status | ◯ | 変更後 |
| `actor_id` | uuid | ◯ | 実行者 |
| `actor_role` | role | ◯ | 実行ロール |
| `action_reason` | text | ◯ | 理由 |
| `terms_json` | jsonb | △ | 条件差分 |
| `created_at` | timestamptz | ◯ | 作成日時 |

---

### 4.19 `revenue_events`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `deal_id` | uuid | ◯ | FK -> deal_pipeline.id |
| `invention_id` | uuid | ◯ | FK -> inventions.id |
| `event_type` | text | ◯ | pre_nda_fee / success_fee / license_fee / royalty_settlement |
| `amount` | numeric(14,2) | ◯ | 金額 |
| `currency` | text | ◯ | 通貨 |
| `scheduled_at` | timestamptz | △ | 発生予定 |
| `realized_at` | timestamptz | △ | 入金日 |
| `memo` | text | △ | 条件補足 |
| `created_at` | timestamptz | ◯ | 作成日時 |
| `updated_at` | timestamptz | ◯ | 更新日時 |

---

### 4.20 `audit_logs`

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| `id` | uuid | ◯ | PK |
| `event_at` | timestamptz | ◯ | 発生時刻 |
| `actor_user_id` | uuid | △ | 実行者 |
| `actor_role` | role | ◯ | ロール |
| `action` | text | ◯ | イベント種別 |
| `entity_type` | text | ◯ | 対象種別 |
| `entity_id` | uuid | ◯ | 対象ID |
| `invention_id` | uuid | △ | 発明ID |
| `company_id` | uuid | △ | 企業ID |
| `deal_id` | uuid | △ | 取引ID |
| `metadata` | jsonb | △ | 補助データ（最小限） |
| `ip` | inet | △ | クライアントIP |
| `user_agent` | text | △ | UA |
| `request_id` | text | △ | リクエスト追跡ID |
| `created_at` | timestamptz | ◯ | 作成日時 |

---

## 5. 作成者 / 更新者 / タイムスタンプ方針

- 各業務テーブルは `created_by`, `updated_by`, `created_at`, `updated_at` を必須または準必須とする。
- 更新時は必ず `updated_by` と `updated_at` を更新。
- 運営起点の更新は監査イベントと合わせて保存する。
- 監査証跡と監査上の整合性担保のため、状態遷移系テーブルは更新履歴を残す。

---

## 6. 論理削除（soft delete）方針

- MVPでは削除を**物理削除しない**。
- `deleted_at` があるものは非表示、必要時のみアーカイブ画面/管理者画面で参照可能。
- 開示・契約履歴は法律上の要請を想定し、原則保持。

---

## 7. private file方針

- すべての `invention_files` は private bucket に保存。
- ファイル単位で `file_scope`（level）を持たせ、開示判定に従って表示可否を分離。
- 直接URL共有は禁止。
- ダウンロードは期限付きsigned URLをサーバー経由で発行。

---

## 8. 将来Supabase移行時の注意点

- UUID + timestamptz ベースに統一。
- enumはSQL ENUMまたはドメインテーブルで運用。
- `invention_screening_scores.axis` など自由度が高い値は、将来型安全を高めるためマスタテーブルへ分離可能。
- RLS前提を前提として、`invention_*` と `company_*` の外部キー参照を設計。
- 監査ログは行レベルで書き込み不変原則（update禁止寄り）を推奨。
- 機密情報は `jsonb` へ過剰保存せず、参照先ID中心でリンク管理。
