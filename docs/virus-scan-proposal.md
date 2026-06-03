# ウイルススキャン 設計提案（未着手・要意思決定）

`docs/storage-policy-plan.md` §10 のウイルスチェックを実装するための **提案ドキュメント**。
スキャナ選定・DBスキーマ変更・課金が絡むため、本ドキュメントは**判断材料**であり、
コードや migration はまだ適用していない。方式が決まり次第、別タスクで実装する。

> 本提案の範囲では migration を作成・適用しない。以下の SQL は**スケッチ**である。

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

## 3. スキーマ変更スケッチ（未適用 / migration 0029 想定）

`invention_files` にスキャン状態列を追加する案。**まだ作成していない。**

```sql
-- スケッチ: 適用しないこと。方式決定後に正式 migration 化する。
do $$ begin
  create type file_scan_status as enum ('pending', 'clean', 'infected', 'error');
exception when duplicate_object then null; end $$;

alter table public.invention_files
  add column if not exists scan_status file_scan_status not null default 'pending',
  add column if not exists scanned_at timestamptz,
  add column if not exists scan_detail text;   -- 検出名/エラー要因など

create index if not exists invention_files_scan_status_idx
  on public.invention_files(scan_status);
```

- RLS: スキャン結果の更新は service_role（ワーカー）に限定。発明者/企業からは更新不可。
  既存の `invention_files` 更新ポリシー（0013/0014/0015）と整合を取る必要がある。

## 4. 配信ゲートへの組込点

`app/company/inventions/[id]/files/[fileId]/route.ts` の既存ゲート
（所属→承認→NDA→レベル→期限→回数）に、**scan_status = 'clean' でなければ拒否**を1段追加する。

- 既存のエラー定数パターンに合わせ `file_scan_pending` / `file_scan_blocked` を追加。
- 発明者のアップロード直後は `pending`。スキャン完了で `clean`/`infected` に更新。
- `infected` は配信ブロック＋operatorへ通知（`lib/notifications/notify.ts` を流用）。

## 5. 非同期トリガ構成（方式Aの場合）

1. アップロード完了で Supabase Storage Webhook → キュー（or 直接ワーカー）。
2. ワーカー（Vercel 外のコンテナ等）が対象パスを service_role でダウンロード→ ClamAV 検査。
3. 結果を `invention_files.scan_status` に書き戻し、必要なら通知。

## 6. 要意思決定（未確認点）

- **スキャナ方式**（A / B / C）。秘密保持の観点では A 推奨だが、運用ホストの用意が必要。
- 方式 B を採る場合の**外部送信に関する法務確認**（NDA・プライバシーとの整合）。
- ワーカーの稼働基盤（Vercel 外コンテナ / Cloud Run / 常駐VM 等）と費用。
- スキャン中ファイルの UX（発明者・operator 画面での「スキャン中」表示の要否）。

上記が確定するまで、コード・migration には着手しない。
