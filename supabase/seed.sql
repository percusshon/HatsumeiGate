-- Seed data for RLS verification (test only)
-- Scope: minimal deterministic fixtures for local security regression checks.
-- Uses non-sensitive dummy data and test-only UUIDs.

DO $$
DECLARE
  v_instance_id uuid;
  v_inventor_a_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_inventor_b_id uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_operator_id uuid := '33333333-3333-3333-3333-333333333333'::uuid;
  v_reviewer_id uuid := '44444444-4444-4444-4444-444444444444'::uuid;
  v_admin_id uuid := '55555555-5555-5555-5555-555555555555'::uuid;
  v_company_user_id uuid := '66666666-6666-6666-6666-666666666666'::uuid;
  v_company_admin_id uuid := '77777777-7777-7777-7777-777777777777'::uuid;
  v_company_legal_id uuid := '88888888-8888-8888-8888-888888888888'::uuid;
  v_partner_id uuid := '99999999-9999-9999-9999-999999999999'::uuid;

  v_company_a_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_company_b_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
  v_invention_a_id uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaa1111'::uuid;
  v_invention_b_id uuid := 'aaaaaaaa-2222-2222-2222-aaaaaaaa2222'::uuid;
  v_disclosure_a_id uuid := 'aaaaaaaa-3333-3333-3333-aaaaaaaa3333'::uuid;
  v_disclosure_b_id uuid := 'aaaaaaaa-4444-4444-4444-aaaaaaaa4444'::uuid;
  v_deal_pipeline_id uuid := 'dddddddd-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_partner_assign_a_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;
  v_partner_assign_b_id uuid := 'cccccccc-1111-1111-1111-cccccccc1111'::uuid;
  v_noda_a_id uuid := 'eeeeeeee-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_noda_b_id uuid := 'eeeeeeee-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
  v_audit_log_id uuid := 'f0000000-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_revenue_id uuid := 'f1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid;
BEGIN
  SELECT id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    v_instance_id := gen_random_uuid();
    INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
    VALUES (v_instance_id, gen_random_uuid(), '{}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- auth.users test principals
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    aud,
    role,
    email_confirmed_at,
    raw_app_meta_data,
    created_at,
    updated_at
  )
  SELECT u.id, v_instance_id, u.email, 'authenticated', 'authenticated', now(), '{}'::jsonb, now(), now()
  FROM (
    VALUES
      (v_inventor_a_id, 'inventor_a@example.test'),
      (v_inventor_b_id, 'inventor_b@example.test'),
      (v_operator_id, 'operator_user@example.test'),
      (v_reviewer_id, 'reviewer_user@example.test'),
      (v_admin_id, 'admin_user@example.test'),
      (v_company_user_id, 'company_user@example.test'),
      (v_company_admin_id, 'company_admin@example.test'),
      (v_company_legal_id, 'company_legal_reviewer@example.test'),
      (v_partner_id, 'partner_user@example.test')
  ) AS u(id, email)
  ON CONFLICT (id) DO NOTHING;

  -- users_profile
  INSERT INTO public.users_profile (
    id,
    role,
    display_name,
    email,
    preferred_language,
    timezone
  )
  VALUES
    (v_inventor_a_id, 'inventor', 'inventor_a', 'inventor_a@example.test', 'ja', 'Asia/Tokyo'),
    (v_inventor_b_id, 'inventor', 'inventor_b', 'inventor_b@example.test', 'ja', 'Asia/Tokyo'),
    (v_operator_id, 'operator', 'operator_user', 'operator_user@example.test', 'ja', 'Asia/Tokyo'),
    (v_reviewer_id, 'reviewer', 'reviewer_user', 'reviewer_user@example.test', 'ja', 'Asia/Tokyo'),
    (v_admin_id, 'admin', 'admin_user', 'admin_user@example.test', 'ja', 'Asia/Tokyo'),
    (v_company_user_id, 'company_user', 'company_user', 'company_user@example.test', 'ja', 'Asia/Tokyo'),
    (v_company_admin_id, 'company_admin', 'company_admin', 'company_admin@example.test', 'ja', 'Asia/Tokyo'),
    (v_company_legal_id, 'company_legal_reviewer', 'company_legal_reviewer', 'company_legal_reviewer@example.test', 'ja', 'Asia/Tokyo'),
    (v_partner_id, 'patent_attorney_partner', 'partner_user', 'partner_user@example.test', 'ja', 'Asia/Tokyo')
  ON CONFLICT (id) DO NOTHING;

  -- app roles for non-inventor roles
  INSERT INTO public.user_app_roles (user_id, role, created_by)
  SELECT v.user_id, v.role, v.created_by
  FROM (
    VALUES
      (v_operator_id, 'operator'::app_role, v_admin_id),
      (v_reviewer_id, 'reviewer'::app_role, v_admin_id),
      (v_admin_id, 'admin'::app_role, v_admin_id),
      (v_company_user_id, 'company_user'::app_role, v_admin_id),
      (v_company_admin_id, 'company_admin'::app_role, v_admin_id),
      (v_company_legal_id, 'company_legal_reviewer'::app_role, v_admin_id),
      (v_partner_id, 'patent_attorney_partner'::app_role, v_admin_id)
  ) AS v(user_id, role, created_by)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_app_roles ur
    WHERE ur.user_id = v.user_id
      AND ur.role = v.role
      AND ur.deleted_at IS NULL
  );

  -- inventions
  INSERT INTO public.inventions (
    id,
    inventor_id,
    title,
    problem_summary,
    solution_summary,
    target_users,
    use_case,
    similar_products,
    prototype_status,
    desired_outcome,
    status,
    visibility_level,
    current_disclosure_level,
    created_by,
    updated_by
  )
  VALUES
    (v_invention_a_id, v_inventor_a_id, 'invention_a', 'test problem a', 'test solution a', 'music creators', 'live stage', 'none', 'none', 'improve workflow', 'submitted', 'internal', 'level_0_internal_only', v_inventor_a_id, v_inventor_a_id),
    (v_invention_b_id, v_inventor_b_id, 'invention_b', 'test problem b', 'test solution b', 'sound engineer', 'studio', 'none', 'none', 'support creators', 'submitted', 'internal', 'level_0_internal_only', v_inventor_b_id, v_inventor_b_id)
  ON CONFLICT (id) DO NOTHING;

  -- invention files
  INSERT INTO public.invention_files (
    invention_id,
    uploaded_by,
    storage_bucket,
    storage_path,
    original_filename,
    mime_type,
    file_size_bytes,
    file_visibility,
    disclosure_level_required
  )
  VALUES
    (v_invention_a_id, v_inventor_a_id, 'invention-files', 'invention-a/dummy-a.pdf', 'dummy-a.pdf', 'application/pdf', 1024, 'internal_only', 'level_1_company_teaser'),
    (v_invention_b_id, v_inventor_b_id, 'invention-files', 'invention-b/dummy-b.pdf', 'dummy-b.pdf', 'application/pdf', 2048, 'internal_only', 'level_1_company_teaser')
  ON CONFLICT DO NOTHING;

  -- submission checks
  INSERT INTO public.invention_submission_checks (
    invention_id,
    submitted_by,
    is_original_inventor,
    has_co_inventors,
    has_public_disclosure,
    includes_third_party_material,
    accepted_terms,
    accepted_terms_at,
    created_by,
    updated_by,
    deleted_at
  )
  VALUES
    (v_invention_a_id, v_inventor_a_id, true, false, false, false, true, now(), v_inventor_a_id, v_inventor_a_id, NULL),
    (v_invention_b_id, v_inventor_b_id, true, false, false, false, true, now(), v_inventor_b_id, v_inventor_b_id, NULL)
  ON CONFLICT DO NOTHING;

  -- status events
  INSERT INTO public.invention_status_events (
    invention_id,
    from_status,
    to_status,
    changed_by,
    reason,
    internal_note,
    visible_to_inventor
  )
  VALUES
    (v_invention_a_id, 'draft', 'submitted', v_operator_id, 'initial submit', 'invention_a submitted', true),
    (v_invention_b_id, 'draft', 'submitted', v_operator_id, 'initial submit', 'internal_only', true)
  ON CONFLICT DO NOTHING;

  -- screening + prior art + strategy
  INSERT INTO public.invention_screening_reports (
    id,
    invention_id,
    reviewer_id,
    overall_rating,
    summary,
    recommendation,
    next_action,
    created_by,
    updated_by
  )
  VALUES
    (
      '11111111-aaaa-4aaa-aaaa-111111111111'::uuid,
      v_invention_a_id,
      v_reviewer_id,
      'A',
      'initial review draft',
      'proceed with internal memo',
      'collect NDA-ready package',
      v_reviewer_id,
      v_reviewer_id
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.invention_screening_scores (
    report_id,
    axis,
    score,
    rationale,
    created_by,
    updated_by
  )
  VALUES
    ('11111111-aaaa-4aaa-aaaa-111111111111'::uuid, 'novelty_hypothesis', 4, 'sufficient novelty signal', v_reviewer_id, v_reviewer_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.prior_art_items (
    invention_id,
    title,
    source_url,
    source_type,
    publication_identifier,
    summary,
    relevance_note,
    risk_level,
    created_by,
    updated_by
  )
  VALUES
    (v_invention_a_id, 'prior art A', 'https://example.test/prior-art-a', 'web', 'PA-001', 'dummy prior art', 'medium', 'medium', v_reviewer_id, v_reviewer_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.ip_strategy_notes (
    invention_id,
    strategy_type,
    note,
    requires_attorney_review,
    created_by,
    updated_by
  )
  VALUES
    (v_invention_a_id, 'patent', 'internal strategy note for testing', true, v_reviewer_id, v_reviewer_id)
  ON CONFLICT DO NOTHING;

  -- company accounts and members
  INSERT INTO public.company_accounts (
    id,
    company_name,
    legal_name,
    website_url,
    industry,
    country,
    review_status,
    reviewed_by,
    reviewed_at,
    review_note,
    created_by,
    updated_by
  )
  VALUES
    (v_company_a_id, 'Company A', 'Company A Co., Ltd.', 'https://company-a.example.test', 'music-tech', 'JP', 'approved', v_admin_id, now(), 'fixture approved', v_admin_id, v_admin_id),
    (v_company_b_id, 'Company B', 'Company B LLC', 'https://company-b.example.test', 'audio-tools', 'JP', 'pending', NULL, NULL, NULL, v_admin_id, v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.company_members (
    company_account_id,
    user_id,
    role,
    created_by
  )
  VALUES
    (v_company_a_id, v_company_user_id, 'company_user'::app_role, v_company_admin_id),
    (v_company_a_id, v_company_admin_id, 'company_admin'::app_role, v_company_admin_id),
    (v_company_a_id, v_company_legal_id, 'company_legal_reviewer'::app_role, v_company_admin_id),
    (v_company_b_id, v_company_user_id, 'company_user'::app_role, v_company_user_id)
  ON CONFLICT DO NOTHING;

  -- NDA accepts (A valid, B expired)
  INSERT INTO public.nda_acceptances (
    id,
    company_account_id,
    user_id,
    accepted_by,
    nda_version,
    accepted_at,
    expires_at,
    revoked_at,
    revoked_by,
    revocation_reason
  )
  VALUES
    (v_noda_a_id, v_company_a_id, v_company_admin_id, v_company_admin_id, 'test-nda-v1', now(), NULL, NULL, NULL, NULL),
    (v_noda_b_id, v_company_b_id, v_company_user_id, v_company_user_id, 'test-nda-v1-expired', now() - interval '40 day', now() - interval '10 day', NULL, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- company disclosure requests
  INSERT INTO public.company_disclosure_requests (
    id,
    invention_id,
    company_account_id,
    requested_by,
    requested_level,
    approved_level,
    status,
    inventor_approved,
    inventor_approved_by,
    inventor_approved_at,
    reviewed_by,
    reviewed_at,
    review_note,
    created_by,
    updated_by
  )
  VALUES
    (v_disclosure_a_id, v_invention_a_id, v_company_a_id, v_company_user_id, 'level_2_nda_summary', 'level_2_nda_summary', 'approved', true, v_inventor_a_id, now() - interval '2 day', v_admin_id, now() - interval '2 day', 'approved by test', v_admin_id, v_admin_id),
    (v_disclosure_b_id, v_invention_b_id, v_company_b_id, v_company_user_id, 'level_3_nda_detail', NULL, 'rejected', false, NULL, NULL, v_admin_id, now(), 'not approved for NDA', v_admin_id, v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.company_invention_views (
    invention_id,
    company_account_id,
    viewed_by,
    disclosure_request_id,
    viewed_level,
    view_context,
    user_agent
  )
  VALUES
    (v_invention_a_id, v_company_a_id, v_company_user_id, v_disclosure_a_id, 'level_2_nda_summary', 'rls_test', 'test-agent')
  ON CONFLICT DO NOTHING;

  -- deal pipeline
  INSERT INTO public.deal_pipeline (
    id,
    invention_id,
    company_account_id,
    disclosure_request_id,
    deal_type,
    status,
    proposed_terms_summary,
    internal_note,
    created_by,
    updated_by
  )
  VALUES
    (v_deal_pipeline_id, v_invention_a_id, v_company_a_id, v_disclosure_a_id, 'exclusive_license', 'interested', 'test deal', 'internal note for test', v_admin_id, v_admin_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_status_events (
    deal_id,
    from_status,
    to_status,
    changed_by,
    reason,
    internal_note,
    visible_to_inventor,
    visible_to_company
  )
  VALUES
    (v_deal_pipeline_id, NULL, 'interested', v_operator_id, 'initial evaluation', 'visible to company for test', false, true)
  ON CONFLICT DO NOTHING;

  -- partner assignment
  INSERT INTO public.partner_invention_assignments (
    id,
    invention_id,
    partner_user_id,
    assigned_by,
    assignment_note,
    revoked_at,
    revoked_by,
    revocation_reason
  )
  VALUES
    (v_partner_assign_a_id, v_invention_a_id, v_partner_id, v_admin_id, 'active assignment for allow-case', NULL, NULL, NULL),
    (v_partner_assign_b_id, v_invention_b_id, v_partner_id, v_admin_id, 'revoked assignment for deny-case', now() - interval '1 hour', v_admin_id, 'assignment revoked for test')
  ON CONFLICT (id) DO NOTHING;

  -- audit / revenue minimal rows for admin direct view checks
  INSERT INTO public.audit_logs (
    id,
    actor_user_id,
    actor_role,
    event_type,
    target_table,
    target_id,
    invention_id,
    company_account_id,
    deal_id,
    metadata,
    created_at
  )
  VALUES
    (v_audit_log_id, v_admin_id, 'admin', 'admin_action', 'inventions', v_invention_a_id, v_invention_a_id, NULL, NULL, '{"reason":"seed fixture"}'::jsonb, now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.revenue_events (
    id,
    deal_id,
    invention_id,
    company_account_id,
    event_type,
    amount,
    currency,
    platform_fee_rate,
    platform_fee_amount,
    inventor_amount,
    occurred_at,
    created_by,
    created_at
  )
  VALUES
    (v_revenue_id, v_deal_pipeline_id, v_invention_a_id, v_company_a_id, 'success_fee', 10000.00, 'JPY', 0.20, 2000.00, 8000.00, now(), v_admin_id, now())
  ON CONFLICT (id) DO NOTHING;

END;
$$;
