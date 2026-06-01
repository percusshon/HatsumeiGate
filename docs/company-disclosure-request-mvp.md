# Company disclosure request creation MVP

## 実装範囲

企業メンバーが、運営から共有された発明ID（UUID）に対して希望開示レベルの開示申請を作成できるようにする。これにより開示フローの起点（申請）が企業側で完結し、happy path が一周する。

- `app/company/actions.ts`：`createDisclosureRequestAction`
- `app/company/page.tsx`：開示申請フォーム（発明ID + 希望レベル）

## happy path（一周）

1. 企業が開示申請を作成（本MVP）→ `status='requested'`, `inventor_approved=false`
2. 発明者が開示同意（migration 0018 / inventor-disclosure-approval-mvp）
3. 運営が承認（operator-disclosure-review-mvp：発明者同意 + NDA + レベル上限ゲート）
4. 企業がゲート付き開示を閲覧（company-disclosure-view-mvp：閲覧ログ記録）
5. 運営が取引（deal）を管理（operator-deal-pipeline-mvp）

## セキュリティ・RLS前提

- 作成は migration 0015 の `company_disclosure_requests_insert_by_member`（企業メンバー）に依存。マイグレーション追加なし。
- サーバアクション側でも企業ロールを事前ガード。発明ID は UUID 形式を検証。
- 企業は発明本文を直接参照できないため、発明ID は運営から共有される前提（ティザー一覧は今後の増分）。

## ローカル検証

- company_user（A所属）が company A の申請を作成 → INSERT 0 1。
- operator（非企業メンバー）が申請を作成 → RLS 違反でブロック。

## 未実装範囲

- 企業向けティザー一覧（どの発明に申請できるかの discovery）
- 同一発明への重複申請の抑止
- 取引（deal）の新規作成（RLS insert ポリシー未整備）
- audit_logs 連動（Phase 12）
