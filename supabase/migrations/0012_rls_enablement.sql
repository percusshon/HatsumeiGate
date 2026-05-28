-- 0012_rls_enablement
-- Purpose:
-- - Enable Row Level Security for app tables before policy implementation.
-- - No policy is created in this migration.
-- - Policy definitions are added later:
--   - 0013_rls_policies_inventor.sql
--   - 0014_rls_policies_operator_admin.sql
--   - 0015_rls_policies_company.sql
--   - 0016_rls_policies_partner.sql
-- Notes:
-- - Policyなしでは通常ロールからの参照が制限される可能性があります。
-- - サービスロール/API経由での運用想定に沿うため、あえてRLSだけを有効化します。
-- - storage.objects のRLSや既存 public-assets policy には本マイグレーションでは触れません。
-- - 特定の保証（特許取得保証/売却保証/収益化保証）に関する表現は含めません。

alter table public.users_profile enable row level security;

alter table public.organizations enable row level security;

alter table public.organization_members enable row level security;

alter table public.inventions enable row level security;

alter table public.invention_files enable row level security;

alter table public.invention_submission_checks enable row level security;

alter table public.invention_status_events enable row level security;

alter table public.invention_screening_reports enable row level security;

alter table public.invention_screening_scores enable row level security;

alter table public.prior_art_items enable row level security;

alter table public.ip_strategy_notes enable row level security;

alter table public.company_accounts enable row level security;

alter table public.company_members enable row level security;

alter table public.nda_acceptances enable row level security;

alter table public.company_disclosure_requests enable row level security;

-- append-only table: only enabling RLS in this migration
alter table public.company_invention_views enable row level security;

alter table public.deal_pipeline enable row level security;

-- append-only table: only enabling RLS in this migration
alter table public.deal_status_events enable row level security;

alter table public.revenue_events enable row level security;

-- append-only table: only enabling RLS in this migration
alter table public.audit_logs enable row level security;
