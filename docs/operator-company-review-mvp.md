# Operator company account review MVP

## 実装範囲

operator / admin が、招待制・審査制の企業アカウントを承認 / 却下 / 停止する最小MVP（roadmap Phase 11 の内部運用部分）。

- `lib/company/review.ts`：`company_accounts.review_status` のラベルと operator 設定可能アクション
- `app/operator/companies/actions.ts`：`reviewCompanyAccountAction`
- `app/operator/companies/page.tsx`：企業アカウント一覧 + 審査結果フォーム
- `/operator`：企業審査への導線追加

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 更新は migration 0014 の `company_accounts_update_ops_admin`（operator/admin）に依存。マイグレーション追加なし。
- 0015 で企業ユーザー側の `company_accounts` 直接 UPDATE は無効化されており、審査状態は運営のみが変更できる。
- サーバアクション側でも operator/admin ロールを事前ガード。
- operator が設定できるのは approved / rejected / suspended（pending は初期状態のため対象外）。

## 未実装範囲（意図的に除外）

- 企業メンバー招待・付与（`company_members` の運営付与UI）
- 開示申請レビュー（`company_disclosure_requests`）→ 別増分
- 企業への発明詳細開示（NDA/開示レベル/閲覧ログ）は service_role API 前提で据え置き
- audit_logs 連動（Phase 12）

## 確認ポイント

- 審査結果が approved/rejected/suspended 以外のとき `invalid_status` で拒否されること
- 審査時に reviewed_by / reviewed_at / review_note が記録されること
- 企業ユーザーが自社の review_status を改変できないこと（RLSで担保）
