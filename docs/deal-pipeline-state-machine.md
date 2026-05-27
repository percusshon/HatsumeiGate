# 取引パイプライン図（MVP）

## 1. Mermaid StateDiagram

```mermaid
stateDiagram-v2
    [*] --> no_interest
    no_interest --> interested : company_admin/company_user
    no_interest --> declined : company_user
    no_interest --> closed : operator/発注不要判定

    interested --> nda_requested : company_user
    interested --> declined : company_user

    nda_requested --> nda_accepted : company_admin / company_legal_reviewer
    nda_requested --> declined : company_user
    nda_requested --> interested : operatorが条件見直し

    nda_accepted --> meeting_requested : company_user
    nda_accepted --> no_interest : operator（再調整）

    meeting_requested --> meeting_completed : company_admin/company_user
    meeting_requested --> declined : company_user

    meeting_completed --> evaluating : operator / inventor
    evaluating --> terms_proposed : operator + inventor
    evaluating --> declined : company_admin

    terms_proposed --> negotiating : company_admin/company_legal_reviewer
    terms_proposed --> evaluating : operator（条件差分修正）

    negotiating --> licensed : inventor+operator+会社合意
    negotiating --> assigned : inventor+operator+会社合意
    negotiating --> joint_development : inventor+operator+会社合意
    negotiating --> declined : 会社側辞退
    negotiating --> closed : 条件相違で打ち切り

    licensed --> closed : 成立後の後続対応
    assigned --> closed
    joint_development --> closed
    declined --> closed
    closed --> [*]
```

## 2. 取引種別の位置づけ

- `transfer`（完全譲渡）
  - 成立後は `assigned`
- `license_exclusive` / `license_non_exclusive`（独占/非独占）
  - 成立後は `licensed`
- `joint_development`
  - 成立後は `joint_development`
- `poc`（実証実験）
  - 通常は `negotiating` の途中ステップで条件提示
- `option`
  - 先行の権利確約がある場合に `terms_proposed` へ反映し、期間経過で `closed`

## 3. 成功報酬イベントの発生想定

- `nda_accepted`
  - 初期費用/手数料候補。`revenue_events.event_type = pre_nda_fee`
- `terms_proposed` の合意更新
  - 条件確定で `terms_updated`、必要時に `revenue_events.event_type = success_fee`
- `licensed/assigned/joint_development`
  - 成立時に `revenue_events.event_type = license_fee / transfer_fee / development_fee`
- ロイヤリティ条件
  - `revenue_events.event_type = royalty_settlement` として実績タイミングで追加

## 4. 弁護士/弁理士確認が必要な地点

### 弁護士確認
- `terms_proposed`（権利範囲・地域・用途・競業制限・違反時救済）
- `negotiating`（契約条項の主要差分）
- `licensed/assigned/joint_development` 直前

### 弁理士確認
- `company_disclosure_ready` 相当から `negotiating` へ進む際の知財要件再確認
- 先行技術差分、請求実質、再設計条件を必要に応じて追加確認

## 5. 通知タイミング（イベント）

- `interested` 登録: 発明者へ即時
- `nda_requested`/`nda_accepted`: 双方同時通知
- `meeting_requested`: 参加者通知
- `terms_proposed` 更新: 1営業日以内共有
- `negotiating`: 条件差分・進行状況を inventor/運営に共有
- `licensed/assigned/joint_development`: 成立通知＋必要資料期限提示
- `declined/closed`: 閉鎖理由を保存して発明者に通知

## 6. 監査ログ対象

- `deal_status_changed`
- `deal_terms_updated`
- `nda_requested` / `nda_accepted`
- `meeting_requested` / `meeting_completed`
- `terms_proposed` の差分
- 成功報酬イベント登録（`revenue_event_recorded`）
- `company_invention_views` の同時参照ログ

## 7. Mermaid記法上の注意

- 実装時は「会社側単独アクション」と「運営承認アクション」を API レイヤでガード。
- 本図は簡略化しており、`deal_status` と `deal_type` の同時制約（例: PoC でも最終的に licensed に遷移可能）は別バリデーションとして保持。
