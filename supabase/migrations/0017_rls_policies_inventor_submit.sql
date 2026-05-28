-- 0017_rls_policies_inventor_submit
-- Purpose:
-- - Minimal RLS support for inventor draft submission flow.
-- - Allow inventor self submit transition draft -> submitted.
-- - Allow inventor insert of draft-to-submitted status event.
-- - This file intentionally does not use service role and does not bypass RLS.

-- Allow inventor to update only draft inventions to submitted.
-- NOTE:
-- - RLS policy alone cannot fully enforce OLD/NEW transition matrix in SQL.
-- - API side must still check current status/inventor/deleted_at before update.
create policy inventions_submit_own_draft
  on public.inventions
  for update
  to authenticated
  using (
    inventor_id = auth.uid()
    and status = 'draft'
    and deleted_at is null
  )
  with check (
    inventor_id = auth.uid()
    and status = 'submitted'
    and deleted_at is null
  );

-- Allow inventor to insert status event only for draft->submitted transition,
-- only when the related invention belongs to them.
create policy invention_status_events_insert_own_submit
  on public.invention_status_events
  for insert
  to authenticated
  with check (
    changed_by = auth.uid()
    and from_status = 'draft'
    and to_status = 'submitted'
    and visible_to_inventor = true
    and public.is_inventor_owner_of_invention(invention_id)
  );
