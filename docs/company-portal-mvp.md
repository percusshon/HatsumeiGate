# Company portal MVP

## 実装範囲

企業メンバー（company_user / company_admin / company_legal_reviewer）が、自社のアカウント状態・NDA・開示申請状況を確認し、NDA同意を記録する最小MVP（roadmap Phase 11 の企業側）。

- `app/company/actions.ts`：`acceptNdaAction`（NDA同意の記録）
- `app/company/page.tsx`：自社アカウント / 所属ロール / NDA履歴 / 開示申請状況の表示 + NDA同意フォーム

## 安全方針

- 本画面は**発明の詳細（本文・図面・ファイル）を一切表示しない**。表示するのは自社の管理情報（アカウント・NDA・開示申請のステータス）のみ。
- 発明詳細の実開示は NDA / 開示承認 / 閲覧ログを満たす安全な経路（API）で別途提供する（migration 0015 の方針に準拠）。

## セキュリティ・RLS前提

- `service_role` は利用しない。
- 表示は migration 0015 の `*_select_by_member`（自社のみ）に依存。RLSにより他社レコードは返らない。
- NDA同意の記録は `nda_acceptances_insert_by_member`（企業メンバー）に依存。マイグレーション追加なし。
- 企業ユーザーは自社の `review_status` を改変できない（0015 で UPDATE 無効、ローカルDBで UPDATE 0 を確認済み）。
- サーバアクション側でも企業ロールを事前ガード。

## ローカル検証（supabase start + seed）

- operator は submitted 発明2件を閲覧可、anon は0件、company_user は発明テーブル直接参照0件（ブロック）。
- company_user は自社2社（A/B）を閲覧可。
- company_user による NDA同意 insert は成功、自社 review_status の UPDATE は0件（ブロック）。
- `next dev` で全主要ルートが 200 を返すことを確認。

## 未実装範囲（意図的に除外）

- 開示申請の新規作成（企業が参照できる発明ティザー level_1 表示が前提のため据え置き）
- 発明詳細の開示ビュー・閲覧ログ記録（service_role API 前提）
- NDA の失効・取消操作、有効期限設定UI
- deal パイプラインの企業側表示
