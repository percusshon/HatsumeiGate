'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isOperatorDealTransitionAllowed } from '@/lib/deal/status';

// deal_pipeline の更新と deal_status_events 追加は operator/admin のみ（migration 0014）。
const OPERATOR_ROLES = ['operator', 'admin'];

export async function updateDealStatusAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const dealId = readValue('deal_id');
  if (!dealId) {
    redirect('/operator/deals?error=deal_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/deals?error=forbidden');
  }

  const toStatus = readValue('to_status');
  if (!toStatus) {
    redirect('/operator/deals?error=status_required');
  }
  const reason = readValue('reason');
  const visibleToInventor = formData.get('visible_to_inventor') === 'on';
  const visibleToCompany = formData.get('visible_to_company') === 'on';

  const supabase = createServerSupabaseClient();

  const { data: deal, error: fetchError } = await supabase
    .from('deal_pipeline')
    .select('id, status')
    .eq('id', dealId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !deal) {
    redirect('/operator/deals?error=not_found');
  }

  const fromStatus = deal.status as string;

  if (fromStatus === toStatus) {
    redirect('/operator/deals?error=same_status');
  }

  if (!isOperatorDealTransitionAllowed(fromStatus, toStatus)) {
    redirect('/operator/deals?error=invalid_transition');
  }

  const { data: updated, error: updateError } = await supabase
    .from('deal_pipeline')
    .update({ status: toStatus, updated_by: currentUser.id })
    .eq('id', dealId)
    .eq('status', fromStatus)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect('/operator/deals?error=update_failed');
  }

  const { error: eventError } = await supabase.from('deal_status_events').insert({
    deal_id: dealId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: currentUser.id,
    reason: reason || null,
    visible_to_inventor: visibleToInventor,
    visible_to_company: visibleToCompany
  });

  if (eventError) {
    redirect('/operator/deals?error=status_event_failed');
  }

  revalidatePath('/operator/deals');
  redirect('/operator/deals?success=deal_updated');
}
