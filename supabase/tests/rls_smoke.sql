-- RLS / RPC smoke assertions for Hatsumei Gate.
-- Run against a local Supabase DB seeded by `supabase db reset`.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
-- Any `raise exception` aborts psql with a non-zero exit (fails CI).
--
-- Seed identities (supabase/seed.sql):
--   inventor_a = 1111..., inventor_b = 2222..., operator = 3333...,
--   company_user(member of A) = 6666..., company A = aaaa...,
--   invention inv1 = aaaaaaaa-1111..., approved disclosure req = aaaaaaaa-3333...

\set ON_ERROR_STOP on

-- Helper: set the authenticated JWT subject for the current transaction.
-- (inlined per-assertion via set local.)

-- 1) deal_pipeline insert: operator allowed, inventor denied.
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
do $$
begin
  insert into public.deal_pipeline (invention_id, company_account_id, deal_type, status, created_by, updated_by)
  values ('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','exclusive_license','interested','33333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333');
exception when others then
  raise exception 'ASSERT FAILED: operator deal insert should succeed (%)', sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  insert into public.deal_pipeline (invention_id, company_account_id, deal_type, status, created_by, updated_by)
  values ('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','option','interested','11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111');
  raise exception 'ASSERT FAILED: inventor deal insert should be denied';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 2) audit_logs: authenticated insert denied (no insert policy).
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
do $$
begin
  insert into public.audit_logs (event_type, target_table, actor_user_id)
  values ('admin_action','smoke','33333333-3333-3333-3333-333333333333');
  raise exception 'ASSERT FAILED: authenticated audit_logs insert should be denied';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 3) notifications: recipient sees own, others do not.
begin;
insert into public.notifications (recipient_user_id, type, title)
values ('11111111-1111-1111-1111-111111111111','smoke','t');
-- owner
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
declare c int;
begin
  select count(*) into c from public.notifications;
  if c < 1 then raise exception 'ASSERT FAILED: owner should see own notification (got %)', c; end if;
end $$;
reset role;
-- other
set local role authenticated;
set local request.jwt.claims to '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
declare c int;
begin
  select count(*) into c from public.notifications;
  if c <> 0 then raise exception 'ASSERT FAILED: other user must not see notifications (got %)', c; end if;
end $$;
rollback;

-- 4) invention_files: owner insert allowed, non-owner denied.
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  insert into public.invention_files (invention_id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, file_size_bytes)
  values ('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','11111111-1111-1111-1111-111111111111','invention-files','aaaaaaaa-1111-1111-1111-aaaaaaaa1111/u/x.pdf','x.pdf','application/pdf',100);
exception when others then
  raise exception 'ASSERT FAILED: owner invention_files insert should succeed (%)', sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
begin
  insert into public.invention_files (invention_id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, file_size_bytes)
  values ('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','22222222-2222-2222-2222-222222222222','invention-files','aaaaaaaa-1111-1111-1111-aaaaaaaa1111/u/y.pdf','y.pdf','application/pdf',100);
  raise exception 'ASSERT FAILED: non-owner invention_files insert should be denied';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 5) inventor_withdraw_invention: owner allowed, non-owner denied.
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  perform public.inventor_withdraw_invention('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','smoke');
exception when others then
  raise exception 'ASSERT FAILED: owner withdraw should succeed (%)', sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
begin
  perform public.inventor_withdraw_invention('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','x');
  raise exception 'ASSERT FAILED: non-owner withdraw should be denied';
exception
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 6) set_inventor_disclosure_approval revoke cascade: approved -> revoked.
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select public.set_inventor_disclosure_approval('aaaaaaaa-3333-3333-3333-aaaaaaaa3333', false);
reset role;
do $$
declare s text;
begin
  select status into s from public.company_disclosure_requests where id='aaaaaaaa-3333-3333-3333-aaaaaaaa3333';
  if s <> 'revoked' then raise exception 'ASSERT FAILED: revoke should cascade to revoked (got %)', s; end if;
end $$;
rollback;

-- 7) inventor_respond_needs_more_info: needs_more_info -> screening.
begin;
update public.inventions set status='needs_more_info' where id='aaaaaaaa-1111-1111-1111-aaaaaaaa1111';
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select public.inventor_respond_needs_more_info('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','note');
reset role;
do $$
declare s text;
begin
  select status into s from public.inventions where id='aaaaaaaa-1111-1111-1111-aaaaaaaa1111';
  if s <> 'screening' then raise exception 'ASSERT FAILED: needs_more_info response should move to screening (got %)', s; end if;
end $$;
rollback;

-- 8) company_advance_deal: member valid allowed, invalid denied, non-member denied.
begin;
insert into public.deal_pipeline (id, invention_id, company_account_id, deal_type, status)
values ('dddddddd-0000-0000-0000-dddddddd00aa','aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','exclusive_license','no_interest');
set local role authenticated;
set local request.jwt.claims to '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
begin
  perform public.company_advance_deal('dddddddd-0000-0000-0000-dddddddd00aa','interested','ok');
exception when others then
  raise exception 'ASSERT FAILED: company member valid deal transition should succeed (%)', sqlerrm;
end $$;
do $$
begin
  perform public.company_advance_deal('dddddddd-0000-0000-0000-dddddddd00aa','licensed','x');
  raise exception 'ASSERT FAILED: invalid company deal transition should be denied';
exception when others then
  if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

begin;
insert into public.deal_pipeline (id, invention_id, company_account_id, deal_type, status)
values ('dddddddd-0000-0000-0000-dddddddd00bb','aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','option','no_interest');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  perform public.company_advance_deal('dddddddd-0000-0000-0000-dddddddd00bb','interested','x');
  raise exception 'ASSERT FAILED: non-member company deal transition should be denied';
exception when others then
  if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 9) company_revoke_nda: member allowed, non-member denied.
begin;
insert into public.nda_acceptances (id, company_account_id, user_id, accepted_by, nda_version, accepted_at)
values ('eeeeeeee-0000-0000-0000-eeeeeeee00aa','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','66666666-6666-6666-6666-666666666666','66666666-6666-6666-6666-666666666666','v1', now());
set local role authenticated;
set local request.jwt.claims to '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
select public.company_revoke_nda('eeeeeeee-0000-0000-0000-eeeeeeee00aa');
reset role;
do $$
declare r timestamptz;
begin
  select revoked_at into r from public.nda_acceptances where id='eeeeeeee-0000-0000-0000-eeeeeeee00aa';
  if r is null then raise exception 'ASSERT FAILED: NDA should be revoked by member'; end if;
end $$;
rollback;

-- 9b) revenue_events: operator insert allowed, inventor inserts denied,
--     inventor sees own invention revenue, others do not.
begin;
insert into public.deal_pipeline (id, invention_id, company_account_id, deal_type, status)
values ('dddddddd-0000-0000-0000-dddddddd0c01','aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','exclusive_license','negotiating');
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
do $$
begin
  insert into public.revenue_events (deal_id, invention_id, company_account_id, event_type, amount, currency, inventor_amount, occurred_at, created_by)
  values ('dddddddd-0000-0000-0000-dddddddd0c01','aaaaaaaa-1111-1111-1111-aaaaaaaa1111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','license_royalty',10000,'JPY',7000, now(),'33333333-3333-3333-3333-333333333333');
exception when others then
  raise exception 'ASSERT FAILED: operator revenue insert should succeed (%)', sqlerrm;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
declare c int;
begin
  select count(*) into c from public.revenue_events where invention_id='aaaaaaaa-1111-1111-1111-aaaaaaaa1111';
  if c <> 0 then raise exception 'ASSERT FAILED: non-owner inventor must not see revenue (got %)', c; end if;
end $$;
do $$
begin
  insert into public.revenue_events (invention_id, event_type, amount, currency, occurred_at)
  values ('aaaaaaaa-1111-1111-1111-aaaaaaaa1111','adjustment',1,'JPY',now());
  raise exception 'ASSERT FAILED: inventor revenue insert should be denied';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- 9c) partner assignment: operator can assign, non-operator denied,
--     assigned partner reads only assigned inventions and cannot write.
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
do $$
begin
  insert into public.partner_invention_assignments (invention_id, partner_user_id, assigned_by)
  values ('aaaaaaaa-2222-2222-2222-aaaaaaaa2222','99999999-9999-9999-9999-999999999999','33333333-3333-3333-3333-333333333333');
exception when others then
  raise exception 'ASSERT FAILED: operator partner assign should succeed (%)', sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  insert into public.partner_invention_assignments (invention_id, partner_user_id, assigned_by)
  values ('aaaaaaaa-2222-2222-2222-aaaaaaaa2222','99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111');
  raise exception 'ASSERT FAILED: non-operator partner assign should be denied';
exception
  when insufficient_privilege then null;
  when others then
    if sqlerrm like 'ASSERT FAILED%' then raise; end if;
end $$;
rollback;

-- partner sees only assigned inventions (seed assigns inv1 to partner 9999).
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
do $$
declare c_assigned int; c_unassigned int;
begin
  select count(*) into c_assigned from public.inventions where id='aaaaaaaa-1111-1111-1111-aaaaaaaa1111';
  select count(*) into c_unassigned from public.inventions where id='aaaaaaaa-2222-2222-2222-aaaaaaaa2222';
  if c_assigned <> 1 then raise exception 'ASSERT FAILED: partner should see assigned invention (got %)', c_assigned; end if;
  if c_unassigned <> 0 then raise exception 'ASSERT FAILED: partner must not see unassigned invention (got %)', c_unassigned; end if;
end $$;
rollback;

-- 10) buckets exist (storage policy prerequisite).
do $$
declare c int;
begin
  select count(*) into c from storage.buckets where id in ('invention-files','company-disclosure-files');
  if c < 2 then raise exception 'ASSERT FAILED: expected storage buckets missing (got %)', c; end if;
end $$;

\echo 'RLS smoke assertions passed.'
