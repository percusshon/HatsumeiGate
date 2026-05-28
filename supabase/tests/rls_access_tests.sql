-- RLS access test for Hatsumei Gate fixtures
-- Execution (local):
--   supabase db query < supabase/tests/rls_access_tests.sql

CREATE TEMP TABLE _rls_test_ids(
  name text PRIMARY KEY,
  value uuid
) ;

INSERT INTO _rls_test_ids(name, value)
VALUES
  ('inventor_a', '11111111-1111-1111-1111-111111111111'::uuid),
  ('inventor_b', '22222222-2222-2222-2222-222222222222'::uuid),
  ('operator', '33333333-3333-3333-3333-333333333333'::uuid),
  ('reviewer', '44444444-4444-4444-4444-444444444444'::uuid),
  ('admin', '55555555-5555-5555-5555-555555555555'::uuid),
  ('company_user', '66666666-6666-6666-6666-666666666666'::uuid),
  ('company_admin', '77777777-7777-7777-7777-777777777777'::uuid),
  ('company_legal_reviewer', '88888888-8888-8888-8888-888888888888'::uuid),
  ('partner', '99999999-9999-9999-9999-999999999999'::uuid),
  ('company_a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  ('company_b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  ('invention_a', 'aaaaaaaa-1111-1111-1111-aaaaaaaa1111'::uuid),
  ('invention_b', 'aaaaaaaa-2222-2222-2222-aaaaaaaa2222'::uuid),
  ('disclosure_a', 'aaaaaaaa-3333-3333-3333-aaaaaaaa3333'::uuid),
  ('deal_pipeline', 'dddddddd-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- 1) anonymous cannot read users_profile
  SET LOCAL ROLE anon;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.users_profile;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: anonymous could read users_profile';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- pass
      NULL;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_inventor_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'inventor_a');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 2) inventor_a can select own invention_a (allow)
  PERFORM set_config('request.jwt.claim.sub', v_inventor_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.inventions
  WHERE id = v_invention_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: inventor_a cannot read own invention_a';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_inventor_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'inventor_a');
  v_invention_b uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_b');
BEGIN
  -- 3) inventor_a cannot read invention_b
  PERFORM set_config('request.jwt.claim.sub', v_inventor_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.inventions WHERE id = v_invention_b;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: inventor_a could read invention_b';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_inventor_b uuid := (SELECT value FROM _rls_test_ids WHERE name = 'inventor_b');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 4) inventor_b cannot read invention_a
  PERFORM set_config('request.jwt.claim.sub', v_inventor_b::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.inventions WHERE id = v_invention_a;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: inventor_b could read invention_a';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 5) company_user cannot directly select inventions
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.inventions WHERE id = v_invention_a;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: company_user could directly select inventions';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 6) company_user cannot directly select invention_files
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.invention_files
    WHERE invention_id = v_invention_a;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: company_user could directly select invention_files';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_admin uuid := (SELECT value FROM _rls_test_ids WHERE name = 'admin');
BEGIN
  -- 7) company_user cannot select audit_logs
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.audit_logs
    WHERE actor_user_id = v_admin
    LIMIT 1;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: company_user could directly select audit_logs';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
BEGIN
  -- 8) company_user cannot select revenue_events
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.revenue_events;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: company_user could directly select revenue_events';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_partner uuid := (SELECT value FROM _rls_test_ids WHERE name = 'partner');
  v_invention_b uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_b');
BEGIN
  -- 9) partner cannot read unassigned invention_b
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.inventions WHERE id = v_invention_b;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: partner_user could read unassigned invention_b';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_partner uuid := (SELECT value FROM _rls_test_ids WHERE name = 'partner');
  v_deal uuid := (SELECT value FROM _rls_test_ids WHERE name = 'deal_pipeline');
BEGIN
  -- 10) partner cannot select deal_pipeline
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.deal_pipeline WHERE id = v_deal;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: partner_user could read deal_pipeline';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_partner uuid := (SELECT value FROM _rls_test_ids WHERE name = 'partner');
BEGIN
  -- 11) partner cannot select audit_logs
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.audit_logs;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DENY_FAIL: partner_user could read audit_logs';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_count := 0;
  END;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_inventor_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'inventor_a');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 12) inventor_a can select own submission checks
  PERFORM set_config('request.jwt.claim.sub', v_inventor_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.invention_submission_checks
  WHERE invention_id = v_invention_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: inventor_a cannot read own invention_submission_checks';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_operator uuid := (SELECT value FROM _rls_test_ids WHERE name = 'operator');
BEGIN
  -- 13) operator can select inventions
  PERFORM set_config('request.jwt.claim.sub', v_operator::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count FROM public.inventions;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: operator should read invention rows';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_reviewer uuid := (SELECT value FROM _rls_test_ids WHERE name = 'reviewer');
BEGIN
  -- 14) reviewer can select screening reports
  PERFORM set_config('request.jwt.claim.sub', v_reviewer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count FROM public.invention_screening_reports;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: reviewer should read screening reports';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_admin uuid := (SELECT value FROM _rls_test_ids WHERE name = 'admin');
BEGIN
  -- 15) admin can select audit_logs
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count FROM public.audit_logs;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: admin should read audit_logs';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_company_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_a');
BEGIN
  -- 16) company_user can select own company_account
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.company_accounts
  WHERE id = v_company_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: company_user should see own company_account';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_company_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_a');
  v_disclosure_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'disclosure_a');
BEGIN
  -- 17) company_user can select own disclosure request
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.company_disclosure_requests
  WHERE id = v_disclosure_a AND company_account_id = v_company_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: company_user should see own disclosure request';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_company_user uuid := (SELECT value FROM _rls_test_ids WHERE name = 'company_user');
  v_deal uuid := (SELECT value FROM _rls_test_ids WHERE name = 'deal_pipeline');
BEGIN
  -- 18) company_user can select visible_to_company deal_status_events
  PERFORM set_config('request.jwt.claim.sub', v_company_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.deal_status_events
  WHERE deal_id = v_deal
    AND visible_to_company = true;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: company_user should see visible_to_company deal_status_events';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_partner uuid := (SELECT value FROM _rls_test_ids WHERE name = 'partner');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 19) partner can select assigned invention_a
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.inventions
  WHERE id = v_invention_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: partner should select assigned invention_a';
  END IF;

  RESET ROLE;
END
$$;

DO $$
DECLARE
  v_count integer;
  v_partner uuid := (SELECT value FROM _rls_test_ids WHERE name = 'partner');
  v_invention_a uuid := (SELECT value FROM _rls_test_ids WHERE name = 'invention_a');
BEGIN
  -- 20) partner can select prior_art_items for assigned invention_a
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.prior_art_items
  WHERE invention_id = v_invention_a;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALLOW_FAIL: partner should select prior_art_items of assigned invention_a';
  END IF;

  RESET ROLE;
END
$$;

SELECT 'RLS access test completed' AS test_result;
