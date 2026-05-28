# RLSアクセス許可アサーション（テーブル×ロール×操作）

> 目的: seed投入前に期待される許可/不許可を固定し、RLS実装の回帰を防ぐ。

## 1. 前提

- `company` 側の詳細開示（inventions/invention_files）は原則テーブル直接SELECTなし。
- storage オブジェクト本体へのアクセスは signed URL/API 側制御前提。
- `audit_logs`,`revenue_events` はadmin以外直接SELECT不可。
- `partner` は `partner_invention_assignments` が有効な発明に限定した read-only。
- append-only系（`company_invention_views`,`invention_status_events`（partner制限）、`deal_status_events`等）は原則 update/delete 無効。

## 2. 記法

- `○`: 許可（該当条件のもと）
- `×`: 不許可
- `条件`: 条件付き（NDA/assigned/deleted_at等）
- `-`: 方針上未実装

## 3. テーブル別権限マトリクス

### users_profile

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a / inventor_b | 自分のみ（0013） | 自分 | 自分 | × |
| operator | ○（内部参照） | × | × | × |
| reviewer | ○（内部参照） | × | × | × |
| admin | ○（広め） | × | ○ | × |
| company_user | ×（原則） | × | × | × |
| company_admin | ×（原則） | × | × | × |
| company_legal_reviewer | ×（原則） | × | × | × |
| patent_attorney_partner | ×（原則） | × | × | × |

### user_app_roles

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a / inventor_b | × | × | × | × |
| operator | × | × | × | × |
| reviewer | × | × | × | × |
| admin | ○ | ○（運用追加） | ○（運用変更） | ○（権限剥奪） |
| company_* | × | × | × | × |
| patent_attorney_partner | × | × | × | × |

### inventions

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a | ownのみ○ | ○（draft） | ownの draft まで○ | × |
| inventor_b | ownのみ○ | ○（draft） | ownの draft まで○ | × |
| operator | ○ | ○（運用） | ○（内部更新） | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○ | × |
| company_user | ×（NDA前） | × | × | × |
| company_admin | ×（NDA前） | × | × | × |
| company_legal_reviewer | ×（NDA前） | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### invention_files

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a | 自ownのみ○ | ○（self） | × | × |
| inventor_b | 自ownのみ○ | ○（self） | × | × |
| operator | ○ | ○（運用） | × | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○（必要時） | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### invention_submission_checks

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a | ownのみ○ | ownのみ○ | ownのみ○ | × |
| inventor_b | ownのみ○ | ownのみ○ | ownのみ○ | × |
| operator | ○ | ○ | ○ | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○ | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### invention_status_events

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a | ownで可視条件時○ | × | × | × |
| inventor_b | ownで可視条件時○ | × | × | × |
| operator | ○ | ○ | × | × |
| reviewer | ○（読み取り中心） | × | × | × |
| admin | ○ | ○ | × | × |
| company_* | × | × | × | × |
| patent_attorney_partner | ×（現行方針） | × | × | × |

### invention_screening_reports

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | × | × | × | × |
| operator | ○ | ○ | ○ | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○ | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### invention_screening_scores

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | × | × | × | × |
| operator | ○ | ○ | ○ | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○ | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### prior_art_items

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | × | ○（self）?（実装差分） | × | × |
| operator | ○ | ○ | ○ | × |
| reviewer | ○ | ○ | ○ | × |
| admin | ○ | ○ | ○ | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### ip_strategy_notes

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | × | × | × | × |
| operator | ○ | ○ | ○ | × |
| reviewer | ○ | × | × | × |
| admin | ○ | ○ | ○ | × |
| company_* | × | × | × | × |
| patent_attorney_partner | 割当発明のみ○ | × | × | × |

### company_accounts

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | × | × | × | × |
| operator/reviewer | ×（本設計） | × | × | × |
| admin | ○ | ○ | ○ | ○（最小運用） |
| company_user | 自所属のみ○ | × | × | × |
| company_admin | 自所属のみ○ | × | × | × |
| company_legal_reviewer | 自所属のみ○ | × | × | × |
| patent_attorney_partner | × | × | × | × |

### company_members

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator/reviewer | × | × | × | × |
| admin | ○ | ○ | ○ | ○ |
| company_user | 自社所属のみ○ | × | × | × |
| company_admin | 自社所属のみ○ | × | × | × |
| company_legal_reviewer | 自社所属のみ○ | × | × | × |
| patent_attorney_partner | × | × | × | × |

### nda_acceptances

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator | ×（本設計） | × | × | × |
| reviewer | ×（本設計） | × | × | × |
| admin | ○ | ○ | × | × |
| company_user | 自所属のみ○ | 自分に紐づく挿入○ | ×（基本） | × |
| company_admin | 自所属のみ○ | 自分に紐づく挿入○ | × | × |
| company_legal_reviewer | 自所属のみ○ | 自分に紐づく挿入○ | × | × |
| patent_attorney_partner | × | × | × | × |

### company_disclosure_requests

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator | ○ | × | ○ | × |
| reviewer | ○（限定） | × | × | × |
| admin | ○ | × | ○ | × |
| company_user | 自社分のみ○ | 自社として申請○ | × | × |
| company_admin | 自社分のみ○ | 自社として申請○ | × | × |
| company_legal_reviewer | 自社分のみ○ | 自社として申請○ | × | × |
| patent_attorney_partner | × | × | × | × |

### company_invention_views

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator | ○ | × | × | × |
| reviewer | ○（限定） | × | × | × |
| admin | ○ | ○ | × | × |
| company_user | 自社分○ | × | × | × |
| company_admin | 自社分○ | × | × | × |
| company_legal_reviewer | 自社分○ | × | × | × |
| patent_attorney_partner | × | × | × | × |

### deal_pipeline

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor_a/b | 自案件/関連のみ○（既存仕様） | × | × | × |
| operator | ○ | × | ○ | × |
| reviewer | ○（限定） | × | × | × |
| admin | ○ | × | ○ | × |
| company_user | 自社分のみ○ | × | × | × |
| company_admin | 自社分のみ○ | × | × | × |
| company_legal_reviewer | 自社分のみ○ | × | × | × |
| patent_attorney_partner | × | × | × | × |

### deal_status_events

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | 自案件のみ可視条件○ | × | × | × |
| operator | ○ | ○ | × | × |
| reviewer | ○（限定） | × | × | × |
| admin | ○ | ○ | × | × |
| company_user | 自社案件 visible_to_company のみ○ | × | × | × |
| company_admin | 自社案件 visible_to_company のみ○ | × | × | × |
| company_legal_reviewer | 自社案件 visible_to_company のみ○ | × | × | × |
| patent_attorney_partner | × | × | × | × |

### revenue_events

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator | ×（現行） | × | × | × |
| reviewer | × | × | × | × |
| admin | ○ | × | × | × |
| company_user | × | × | × | × |
| company_admin | × | × | × | × |
| company_legal_reviewer | × | × | × | × |
| patent_attorney_partner | × | × | × | × |

### audit_logs

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator | ×（基本） | × | × | × |
| reviewer | ×（基本） | × | × | × |
| admin | ○ | ○（service） | × | × |
| company_* | × | × | × | × |
| patent_attorney_partner | × | × | × | × |

### partner_invention_assignments

| role | select | insert | update | delete |
|---|---:|---:|---:|---:|
| anonymous | × | × | × | × |
| auth no profile | × | × | × | × |
| inventor系 | × | × | × | × |
| operator/reviewer | ×（未実装） | × | × | × |
| admin | ○（必要なら） | ○ | ○ | ○ |
| company_* | × | × | × | × |
| patent_attorney_partner | 自分の有効割当のみ○ | × | × | × |

## 4. 重要確認項目（重点アサーション）

- **anonymous/authenticated without profile**: appテーブル一切不可
- **inventor_a**: `invention_b` の閲覧不可
- **company_user**: `inventions` / `invention_files` / `audit_logs` / `revenue_events` の直接SELECT不可
- **company_admin/company_legal_reviewer**: 上記同様＋開示条件以外の権限拡張なし
- **patent_attorney_partner**: `partner_invention_assignments` active な発明だけ読み取り可、他は不可
- **partner revoked**: 無効化割当では該当発明の閲覧不可
- **audit/revenue**: `admin` 以外は `SELECT` 不可

## 5. 未決事項

- `user_app_roles` のRLSテーブル自体は最小実装では未定義部分があり、テストでは「policy既定=deny」を前提に扱う。
- `prior_art_items` の inventor 自己作成可否が実装差分で変動するため、現時点では要再確認フラグ付き。
