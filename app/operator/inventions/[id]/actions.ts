'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isOperatorTransitionAllowed } from '@/lib/invention/status';

const OPERATOR_ROLES = ['operator', 'admin'];

export async function updateInventionStatusAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }

  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // RLS でも operator/admin に限定されるが、UX のため事前ガードする。
  const isOperator = currentUser.roles.some((role) => OPERATOR_ROLES.includes(role));
  if (!isOperator) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const toStatus = readValue('to_status');
  const reason = readValue('reason');
  const visibleToInventor = formData.get('visible_to_inventor') === 'on';

  if (!toStatus) {
    redirect(`${detailPath}?error=status_required`);
  }

  const supabase = createServerSupabaseClient();

  const { data: invention, error: fetchError } = await supabase
    .from('inventions')
    .select('id, status')
    .eq('id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !invention) {
    redirect(`${detailPath}?error=not_found`);
  }

  const fromStatus = invention.status as string;

  if (fromStatus === toStatus) {
    redirect(`${detailPath}?error=same_status`);
  }

  if (!isOperatorTransitionAllowed(fromStatus, toStatus)) {
    redirect(`${detailPath}?error=invalid_transition`);
  }

  const { data: updated, error: updateError } = await supabase
    .from('inventions')
    .update({
      status: toStatus,
      updated_by: currentUser.id
    })
    .eq('id', inventionId)
    .eq('status', fromStatus)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect(`${detailPath}?error=update_failed`);
  }

  const { error: eventError } = await supabase.from('invention_status_events').insert({
    invention_id: inventionId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: currentUser.id,
    reason: reason || null,
    visible_to_inventor: visibleToInventor
  });

  if (eventError) {
    redirect(`${detailPath}?error=status_event_failed`);
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=status_updated`);
}
