# Inventor disclosure approval MVP

## 実装範囲

発明者が、自分の発明に対する企業の開示申請を確認し、開示同意（`inventor_approved`）を設定/取消できるようにする（roadmap Phase 11 の発明者同意ゲート）。これにより operator の開示承認ゲート（発明者同意必須）が実フローで満たせるようになる。

- `supabase/migrations/0018_inventor_disclosure_approval.sql`：
  - 発明者が自分の発明の開示申請を SELECT できる RLS ポリシー
  - `set_inventor_disclosure_approval(_request_id, _approved)` SECURITY DEFINER 関数
- `app/inventor/inventions/[id]/disclosure-actions.ts`：`setDisclosureApprovalAction`（RPC 呼び出し）
- `app/inventor/inventions/[id]/page.tsx`：開示同意セクション（申請レベル / 承認レベル / 状態 / 同意可否）

## 列単位制限の方針

開示申請テーブルには `status` / `approved_level`（運営専管）と `inventor_approved`（発明者専管）が混在する。RLS UPDATE は列単位制限ができないため、**発明者にはテーブル直接 UPDATE を与えず**、SECURITY DEFINER 関数経由で `inventor_approved` 系の列のみ更新する。関数内で「呼び出し元が当該発明の発明者本人」であることを検証する。

## セキュリティ・RLS前提

- `service_role` は利用しない（SECURITY DEFINER 関数 + authenticated への execute 付与）。
- 発明者は他人の発明の開示申請を閲覧・更新できない（関数内チェック + SELECT ポリシー）。
- 非破壊（追加のみ）のマイグレーション。

## ローカル検証（supabase migration up + seed）

- inventor_a は自分の発明の開示申請を1件閲覧可。
- inventor_a が RPC で同意 → `inventor_approved = true`。
- inventor_b（非所有者）が invention_a の申請を更新 → `ERROR: not authorized`。

## 未実装範囲

- 開示申請に紐づく企業名の発明者への表示（company_accounts への発明者SELECTは未付与。MVPでは申請レベルのみ提示）
- 同意取消時に承認済み開示を失効させる連動処理
- 通知連携
