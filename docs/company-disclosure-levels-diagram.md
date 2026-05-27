# 開示レベル図（NDA前後分離）

## 1. Mermaid Flowchart

```mermaid
flowchart TD
    subgraph L[Disclosure Level Progression]
        L0[level_0_internal_only\n(運営内部用)]
        L1[level_1_company_teaser\n(概要/課題)]
        L2[level_2_nda_summary\n(要約 + 条件)]
        L3[level_3_nda_detail\n(設計の核心)]
        L4[level_4_negotiation_package\n(提案条件)]
    end

    subgraph B[Boundary Check]
        ICONSENT[発明者同意済み?]\n    C[企業NDA必要?]\n    LOG[開示ログ記録済み?]
        DLOCK[競合制限OK?]
    end

    subgraph V[View Rules]
        V0[NDA前の見える情報\nタイトル・匿名要約・公開情報のみ]
        V1[NDA前でも見える情報\n要約/想定シーン/効果の非数値]
        V2[NDA成立後\n要約図/適用条件]
        V3[NDA成立後\n詳細図面/比較表/比較対象]
        V4[NDA成立後\n価格帯/契約条件/交渉パッケージ]
    end

    L0 --> ICONSENT
    ICONSENT -->|NG: 企業には非表示| V0
    ICONSENT -->|OK| L1

    L1 --> C
    C -->|未成立: 取得不可| V1
    C -->|成立: level_2以降条件可| L2

    L2 --> LOG
    LOG -->|未記録: 取得不可| V2
    LOG -->|記録あり: 条件付き\ncompany_invention_views| L3

    L3 --> DLOCK
    DLOCK -->|競合上不許可: レベル縮退または停止| V3
    DLOCK -->|許可: 開示継続| L4

    L4 --> DLOCK

    V0 -->|level_0_internal_only\n(公開不可) | END0((閲覧不可))
    V1 --> V2 --> V3 --> V4

    V0 -->|signed URL| END0
    V2 -->|file download\nlevel<=2| F2[ファイルscope=nda_summary以下のみ]\n
    V3 -->|file download\nlevel>=3 + nda_accepted| F3[ファイルscope=nda_detail以下]\n    V4 -->|file download\nlevel=4 + NDA有効\ndownload上限を確認| F4[ファイルscope=negotiation_package]\n
    subgraph FileBoundary[private file / signed URL]
        SB[private bucket]\n        SIGN[署名URL発行]
        F2 --> SB --> SIGN
        F3 --> SB --> SIGN
        F4 --> SB --> SIGN
        SIGN -->|成功時のみ| V4
        SIGN -->|失敗時は監査記録| LOG
    end

    END0 -.-> HALT[非公開\n閲覧ログなしで詳細返却しない\n
audit log必須]
```

## 2. 開示レベル別に見せる情報

- `level_0_internal_only`
  - 見せる: 匿名タイトル、カテゴリ、公開履歴、内部メモ
  - 隠す: 技術要点、図、試作結果、連絡先、価格条件
- `level_1_company_teaser`
  - 見せる: 課題要約、想定シーン、効果（数値なし）
  - 隠す: 具体構造、図面、実装式、試作詳細
- `level_2_nda_summary`
  - 見せる: 要約構成図、導入条件の高レベル、主要価値
  - 隠す: 詳細回路、設計式、試作手順
- `level_3_nda_detail`
  - 見せる: 主要メカニズム、比較表、導入フロー、評価サマリ
  - 隠す: 未確定条件、代替設計の秘匿点、顧客データ
- `level_4_negotiation_package`
  - 見せる: 条件レンジ、提案スコープ、交渉メモ
  - 隠す: 未公開の二次材料、確定前情報

## 3. NDA前/後の境界

- `level_1` はNDA不要で許可しうる情報を含め、`level_2/3/4` は原則NDA同意後。
- `invention.current_disclosure_notes` と `company_disclosure_requests.target_level` を整合して配信対象を決定。
- `nda_acceptances` が無効・期限切れなら、`level_3/4` の表示を即時遮断。

## 4. 企業NDA・発明者同意境界

- 企業NDAが未成立なら、`level_2` 以上の機密を返さない。
- 発明者同意がないレベル変更は実行不可。
- 競合企業リスクが高い案件は、`competing_block=true` の場合に開示を縮退。

## 5. 閲覧ログ境界

- `company_invention_views` 未登録での企業詳細閲覧は禁止。
- レベル3/4 のファイルdownloadは、
  - signed URL発行成功時
  - 対象ビュー履歴保存成功時
  - 開示レベル/有効NDAの再チェックを必須化。

## 6. 競合企業制限

- 同一競合カテゴリでの同時公開は、まず要約レベル化。
- 開示優先日を記録し、重複開示時は情報粒度を引き下げる。
- `DLOCK` 条件に反する場合は `closed` へ移すか、`approved_level` を縮退。

## 7. Mermaid記法上の注意

- 行内改行は `\n` を使用。
- ここでは説明用に状態遷移の境界を簡略化。実装時は `company_disclosure_requests` と `nda_acceptances` の状態をガード条件へ反映。
