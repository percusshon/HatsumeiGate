# Company gated disclosure view MVP

## 実装範囲

企業メンバーが、承認された開示レベルに応じて発明情報を閲覧できるゲート付きビュー（roadmap Phase 11 の核心）。アーキテクチャ方針（migration 0015 コメント）どおり、**service_role API + DTO フィルタ + 閲覧ログ**で実装する。

- `lib/supabase/admin.ts`：server-only の service_role クライアント（開示API限定）
- `lib/company/disclosure-dto.ts`：開示レベル別の列 allow-list で DTO を生成
- `app/company/inventions/[id]/page.tsx`：ゲート付き開示ビュー
- `app/company/page.tsx`：承認済み開示申請から開示ビューへの導線
- `.env.example`：`SUPABASE_SERVICE_ROLE_KEY`（プレースホルダ）追加

## 認可ゲート（service_role を使うため、コードで厳格に検証）

開示前に以下をすべて満たすことをコードで確認する:

1. **本人認証**：anon セッションの検証済みユーザーIDを使用（クエリパラメータ等は信用しない）。
2. **所属企業**：`company_members` で当該ユーザーの企業を特定。
3. **開示承認**：当該発明への `status='approved'` かつ `inventor_approved=true` かつ `approved_level` 設定済みの申請が、所属企業に存在。最高承認レベルを採用。
4. **NDA**：`approved_level` が level_2 以上なら、その企業に有効NDA（revoked/expired でない）が必須。

## 列単位の開示制御（DTO）

開示レベルのランクに応じて表示列を段階的に許可:

- level_1: タイトル / 課題要約 / 想定シーン / 期待効果
- level_2: + 対象ユーザー / 解決方針（要約）
- level_3: + 既知の類似 / 試作状況

RLS は行単位のため列単位開示を表現できない。そのため service_role 経由でこの DTO を必ず通す。

## 閲覧ログ（漏洩対策の必須要件）

開示前に `company_invention_views`（append-only）へ viewed_by / company / invention / disclosure_request_id / viewed_level / view_context / user_agent を記録する。画面には外部共有禁止の注意文を常時表示。

## セキュリティ

- `SUPABASE_SERVICE_ROLE_KEY` は server-only。`.env.local`（gitignore 済み）にのみ実値を置き、`.env.example` はプレースホルダ。`lib/supabase/admin.ts` をクライアントから import しない。
- service_role は RLS をバイパスするため、認可は上記4条件をコードで担保。

## ローカル検証（supabase + seed）

- company_user（A/B所属）が invention_a を閲覧 → company A の level_2 承認 + 有効NDA があり許可（level_2 DTO）。
- invention_b → 承認なし（rejected）で拒否。
- 閲覧ログ insert がスキーマ整合（INSERT 0 1）。

## 未実装範囲

- level_4（交渉パッケージ）の価格・条件など deal 連動項目の開示
- 透かし付きPDF / ダウンロード制御
- 競合同時開示の縮退制御（workflow §3）
- IP アドレス記録（user_agent のみ記録）
