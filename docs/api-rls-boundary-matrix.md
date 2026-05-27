# API / RLS Boundary Matrix

## 1. 目的

APIでの権限判定とRLSのどちらで何を守るかを明確化し、NDA前後・閲覧ログ・同意情報の漏れをなくす。

## 2. 境界方針

- **認証必須**: MVPでは全業務APIは認証必須。
- **RLSは最終防御**: 行レベルアクセスはRLSで強制。
- **APIは業務ルール防御**: ステータス遷移、NDA/同意、競合制約、回数上限などをAPIで追加検証。
- **company detail view原則**: 企業向け詳細レスポンスは `company_invention_views` を記録してから返却。

## 3. API境界一覧

| API | 呼び出し主体 | NDA必要 | 発明者同意必要 | 閲覧ログ必要 | RLSで守る条件 | API側追加検証 | 監査イベント | 失敗時エラー方針 |
|---|---|---|---|---|---|---|---|
| POST /api/inventions/draft | inventor | 不要 | `submission_check`未提出でも可（作成時） | 不要 | self所有（`inventor_id = auth.uid()`） | draft必須項目、公開履歴警告有無 | invention_created | 400バリデーション / 401 / 422(公開情報ガイド違反) |
| PATCH /api/inventions/:id/draft | inventor / operator(補助) | 不要 | 不要 | 不要 | owner/self or operator範囲 | draft状態のみ更新許可、不要項目変更禁止 | invention_updated | 409(status不整合) / 403 |
| POST /api/inventions/:id/submit | inventor | 不要 | 投稿前チェックで必要同意 | 不要 | owner/selfのみ、status=draftのみ | 事前チェック完了・status遷移整合 | invention_status_changed | 400/409/412(必要チェック不足) |
| GET /api/inventions/:id | inventor/operator/reviewer/admin/company_user/admin? | 企業向けは場合あり | 企業向けで disclosure levelを満たす場合のみ | 企業閲覧時は必要 | inventorは self、operator/reviewerは内部、companyは開示条件付き | NDA/開示レベル、公開可否 | invention_read | 403(NDA/競合違反)/404(非開示対象) |
| PATCH /api/operator/inventions/:id/status | operator/admin/reviewer | 必要に応じ（会社案件時） | なし | なし | operator内部 / admin全件 | ステータス遷移妥当性、理由コード、次アクション | invention_status_changed | 409(invalid transition) / 412(必要条件不足) |
| POST /api/operator/inventions/:id/screening-report | operator/admin/reviewer | 不要 | 不要 | 不要 | operator/admin範囲 | score範囲（0-5）、decision整合、A-E整合 | screening_report_saved | 400(validation) / 403 |
| PATCH /api/operator/inventions/:id/screening-report | operator/admin/reviewer | 不要 | 不要 | 不要 | 同上 | 同上（更新差分必須） | screening_report_saved | 404/409(再提出不可) |
| POST /api/operator/inventions/:id/prior-art | operator/admin/reviewer | 不要 | 不要 | 不要 | operator/admin範囲 | 参考資料URL形式・類似度レンジ検証 | prior_art_item_updated | 400 / 403 |
| POST /api/operator/inventions/:id/ip-strategy-notes | operator/admin/reviewer | 不要 | 不要 | 不要 | operator/admin範囲 | strategy値の許容値、断定表現NGチェック | ip_strategy_note_updated | 400 / 422(誤導表現) |
| POST /api/inventions/:id/files | inventor / operator | 不要 | なし | 不要(メタのみ) | ownerまたはoperator | ファイル種別許容、`file_scope`初期値、ハッシュ保存 | file_uploaded | 400(format) / 413(size) |
| GET /api/inventions/:id/files | inventor / operator / company | 企業はNDA要件に応じ可否 | 発明者同意時のみ開示情報扱い可 | 企業向けdetail時のみ必要 | companyは `company_invention_views` 起点の参照制御、inventor/operatorは対象案件 | NDA状態、競合制約、削除済み/無効フラグ | file_list_view | 403(権限制御) / 404 |
| POST /api/invention-files/:fileId/signed-url | inventor / operator / company_admin/company_legal_reviewer | 企業時はレベル3/4要 | 企業向けは開示同意付き | 必須 | file owner/operator/company with disclosure log condition | signed URL有効期限、利用上限制御、閲覧ログ存在確認 | file_downloaded（発行時） | 403(NDA未成立)/409(閲覧制限) |
| POST /api/company/account-review | company_user / company_admin | 不要（事前情報） | 発明者開示同意が必要 | 不要 | 企業所属、companyアカウントの有効性 | 申請案件/表示レベルの妥当性 | company_account_review_requested | 422(不正カテゴリ) |
| POST /api/company/nda/accept | company_admin / company_legal_reviewer | 同意対象ごとに実施 | 開示に対する発明者同意済み必要 | 不要 | self所属 company のリクエストのみ | 同意版の記録、有効期限、担当者 | nda_accepted | 409(重複同意) / 412(必須項目欠落) |
| POST /api/company/disclosure-requests | operator/admin/company_admin | 開示前後で差分あり | 発明者同意の有無確認 | `disclosure`前提で開示前ログは最小 | RLSでcompany所属+requestステータス一致 | level, NDA前提, competing_block, expires_at妥当性 | disclosure_request | 400 / 403 / 412 |
| GET /api/company/inventions/:id | company_user / company_admin / company_legal_reviewer | levelに応じる（2以上で許可） | あり（開示可能範囲） | 必須（company view） | company scope + disclosure request + status | 開示レベル降順表示、競合企業制限、log_id付与 | company_invention_viewed | 403/404/409 |
| PATCH /api/operator/disclosure-requests/:id | operator/admin | 不要 | あり（開示許可時） | 不要 | operator/admin範囲 | 承認時はNDA有無と同意整合 | disclosure_approved | 400/409 |
| PATCH /api/deals/:id/status | operator/admin/company_admin / company_legal_reviewer | 条件: 取引種別・段階で必要 | あり（成立系） | 不要 | 取引案件担当 + admin | from/to妥当性、法務チェックフラグ確認、成立条件 | deal_status_changed | 409(invalid transition) / 412(法務未確認) |
| GET /api/audit/inventions/:id | inventor / operator / admin / reviewer | 企業向けでは不可 | なし | 不要 | 自身の案件 or 運営全件 | actor権限別最小項目、機微情報除外 | audit_viewed | 403 / 404 |

## 4. API側ガードが必須（RLSでは難しい）

- status遷移の意味論（例: `submitted` から `licensed` への直行）
- 開示レベル上位遷移（level_1→level_3）の根拠
- NDA期限切れ・競合企業同時開示の動的制御
- 同意文言の最新性（re-consent）
- signed URL生成時のレート制御と回数上限

## 5. RLSだけでは危険なもの（APIで補強）

- ファイル配布時の一時的 signed URL 発行と無効化管理
- 2段階通知（運営＋当事者）
- 監査ログに含めるメタ情報の最小化判定
- 一時停止案件での開示遮断（closed/unavailable）

## 6. API側に寄せると危険なもの（RLSで補完）

- 全件取得APIの誤開示: RLSで未承認行を除外しないとAPI実装不備で漏洩
- 自分の案件限定判定: self filterをRLSでも確認
- 企業所属の再評価: セッションとcompany_membersの実在チェックはRLS・API双方

## 7. signed URL発行境界

- inventor: 自案件の file scope が `internal_only`〜であれば作成可（公開範囲外）
- company_user: 開示ログあり + NDA成立 + `disclosure level >= level_3`
- company_admin/company_legal_reviewer: 承認案件 + 承認済み役割 + `company_invention_views` 記録
- service_role: 内部運用ジョブとしてみなし発行し、監査 event を付与

## 8. company detail view原則

- `GET /api/company/inventions/:id` では、内部で以下を順守:
  1. `company_invention_views` を保存（result=ok か denied）
  2. 保存成功後のみレスポンス本文を返却
  3. deny時は `file_*` / `invention` の機密項目を伏せる
  4. 監査イベント `company_invention_viewed` を同時保存

## 9. 未決事項

- 既存設計の `company_account:review` を `reviewer` とどう共有するか。
- patent_attorney_partner の file:read_disclosedの拡張有無。
- 失敗時に `404` と `403` のどちらに統一するか（非表示観測のため）。
