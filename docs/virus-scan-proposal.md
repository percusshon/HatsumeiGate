# ウイルススキャン 設計（基盤実装済み・スキャナワーカーは未配線）

`docs/storage-policy-plan.md` §10 のウイルスチェック。
**スキャン基盤（スキーマ＋配信ゲート）は実装済み**（migration 0029）。
実スキャナ（ワーカー）は外部インフラと方式選定に依存するため未配線。

実装済みの範囲（後方互換・非破壊）:
- `invention_files.scan_status`（enum `file_scan_status`: pending/clean/infected/error、既定 pending）。
- 配信ゲート（`app/company/inventions/[id]/files/[fileId]/route.ts`）が
  `scan_status = 'infected'` のファイルのみ配信拒否（`?error=file_scan_blocked`）。
  pending/clean/error は配信可なので、スキャナ未配線でも既存挙動は不変。
- `scan_status` の書込は service_role のみ（invention_files に authenticated の UPDATE
  ポリシーが無いため、発明者・企業・operator はスキャン状態を改竄できない）。

未実装（方式決定・インフラ依存）:
- 実スキャナワーカー（アップロードを検査し scan_status を clean/infected に更新）。
- 「clean 必須」への厳格化（現状は infected のみブロック。下記 §4 参照）。

> 以下 §2/§3 は方式選定の判断材料。§3 の SQL は**適用済みの 0029 に対応**する。

## 1. 要件

- 発明者がアップロードしたファイル（`invention-files` バケット）に対し、保存後に
  非同期でウイルススキャンを行う。
- スキャン未完了 / 検出ありのファイルは、**企業への開示・配信をブロック**する。
- 結果（clean / infected / error）と検査時刻を監査可能な形で記録する。
- 既存のアップロード〜開示ゲート（`app/company/inventions/[id]/files/[fileId]/route.ts`）の
  最小改修で組み込めること。

## 2. スキャナ方式の比較

| 方式 | 概要 | 長所 | 短所 |
| --- | --- | --- | --- |
| **A. ClamAV セルフホスト** | `clamd` を常駐させ、Edge Function / 外部ワーカーから検査 | 追加課金なし・OSS・オフライン可 | 運用負荷（定義更新/メモリ）、Vercel 上では常駐困難＝別ホスト要 |
| **B. クラウドスキャンAPI** | VirusTotal / Cloudmersive 等へファイルを送って判定 | 運用ほぼ不要・多エンジン | 月額課金・**機密ファイルを外部送信**＝秘密保持と相反、レート制限 |
| **C. Supabase Edge Function + ClamAV WASM/軽量定義** | Edge 内で軽量スキャン | 外部送信なし | WASM 版の検出力・メモリ制約が未知、要PoC |

### 評価メモ
- 本サービスは**秘密保持が中核**。方式 B（外部送信）は、発明ファイルを第三者APIへ
  渡すことになり、`/legal`・`/privacy` の秘密保持方針および NDA と整合しない懸念が大きい。
  採用するなら「スキャン目的の限定送信」の法務確認が前提。
- 機密性を優先するなら **方式 A（自前 ClamAV を Vercel 外のワーカー/コンテナで運用）** が
  本命。Supabase Storage の Webhook かキューでスキャンをトリガする構成。
- 方式 C は PoC 次第。検出力が業務要件を満たすか要検証。

## 3. スキーマ（migration 0029 / 適用済み）

`invention_files` にスキャン状態列を追加済み（`supabase/migrations/0029_invention_files_scan_status.sql`）。

```sql
do $$ begin
  create type file_scan_status as enum ('pending', 'clean', 'infected', 'error');
exception when duplicate_object then null; end $$;

alter table public.invention_files
  add column if not exists scan_status file_scan_status not null default 'pending',
  add column if not exists scanned_at timestamptz,
  add column if not exists scan_detail text;

create index if not exists invention_files_scan_status_idx
  on public.invention_files(scan_status);
```

- RLS: `invention_files` には authenticated ロールの UPDATE ポリシーが存在しないため、
  scan_status の書込は service_role（アプリ/ワーカー）に限定される。発明者・企業・operator は
  スキャン状態を改竄できない（追加ポリシー不要）。

## 4. 配信ゲートへの組込（実装済み）

`app/company/inventions/[id]/files/[fileId]/route.ts` の既存ゲート
（所属→承認→NDA→レベル→**スキャン**→回数）に、**scan_status = 'infected' なら拒否**を1段追加済み。

- エラー定数 `file_scan_blocked` を追加（`?error=file_scan_blocked`）。判定は
  `lib/storage/invention-files.ts` の `isFileBlockedByScan()`。
- **後方互換のため `pending`（未スキャン）/`error`/`clean` は配信可**。スキャナ未配線でも既存挙動は不変。
- 将来スキャナが常時稼働したら「clean 必須」へ厳格化可能（`isFileBlockedByScan` を変更）。
  その際は未スキャンファイルの扱い（移行期の暫定許可など）を別途決める。
- `infected` 検出時の operator 通知（`lib/notifications/notify.ts`）はワーカー実装時に配線する。

## 5. 非同期トリガ構成（方式Aの場合）

1. アップロード完了で Supabase Storage Webhook → キュー（or 直接ワーカー）。
2. ワーカー（Vercel 外のコンテナ等）が対象パスを service_role でダウンロード→ ClamAV 検査。
3. 結果を `invention_files.scan_status` に書き戻し、必要なら通知。

## 6. 残: 要意思決定（ワーカー実装の前提）

基盤（§3/§4）は実装済み。以下が決まればワーカーを実装してスキャンを有効化できる。

- **スキャナ方式**（A / B / C）。秘密保持の観点では A 推奨だが、運用ホストの用意が必要。
- 方式 B を採る場合の**外部送信に関する法務確認**（NDA・プライバシーとの整合）。
- ワーカーの稼働基盤（Vercel 外コンテナ / Cloud Run / 常駐VM 等）と費用。
- 「clean 必須」へ厳格化するか（現状は infected のみブロック）。
- スキャン中ファイルの UX（発明者・operator 画面での「スキャン中」表示の要否）。

上記が確定するまで、コード・migration には着手しない。
