# Operator disclosure request review MVP

## 実装範囲

operator / admin が、企業からの開示申請（`company_disclosure_requests`）を承認 / 却下 / 取消する内部運用画面（roadmap Phase 11）。

- `lib/company/disclosure.ts`：開示レベル（level_0〜4）のラベル・ランク・NDA要否判定、申請ステータスのラベル
- `app/operator/disclosures/actions.ts`：`reviewDisclosureRequestAction`
- `app/operator/disclosures/page.tsx`：開示申請一覧（発明・企業・申請レベル・発明者同意・NDA状況）+ 審査フォーム
- `/operator`：開示申請レビューへの導線追加

## 承認ゲート（安全要件）

承認（approved）時は次をすべて満たす必要がある:

1. **発明者の開示同意**（`inventor_approved = true`）がある。ない場合 `inventor_not_approved`。
2. **承認レベル ≦ 申請レベル**（過剰開示の禁止）。超過時 `level_exceeds_request`。
3. **level_2 以上は有効なNDAが必須**（`nda_acceptances` が revoked/expired でない）。無い場合 `nda_required`。

却下 / 取消では `approved_level` をクリアする。

## 重要な据え置き

- 本画面は**開示承認の記録のみ**を行い、企業への発明詳細の実開示・閲覧ログ（`company_invention_views`）は行わない。実開示は service_role API + DTO フィルタ + 閲覧ログ前提のため別経路で扱う（migration 0015 のコメント方針に準拠）。

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 更新は migration 0014 の `company_disclosure_requests_update_ops_admin`（operator/admin）に依存。マイグレーション追加なし。
- NDA有効性チェックはアプリ側で `nda_acceptances`（revoked_at/expires_at/accepted_at）を確認し、DB関数 `has_active_company_nda` と同等の条件を用いる。
- サーバアクション側でも operator/admin ロールを事前ガード。

## 確認ポイント

- 発明者同意なしで承認しようとすると `inventor_not_approved` で拒否されること
- level_2 以上を有効NDAなしで承認しようとすると `nda_required` で拒否されること
- 申請レベルを超える承認レベルが `level_exceeds_request` で拒否されること
- 承認しても企業側に発明詳細が直接表示されないこと（実開示は未実装）
