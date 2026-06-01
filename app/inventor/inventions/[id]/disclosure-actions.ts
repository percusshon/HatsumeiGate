'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

// 発明者の開示同意は SECURITY DEFINER 関数経由（migration 0018）。
// 本人確認は関数内で行うため、ここでは認証のみ確認する。
export async function setDisclosureApprovalAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  const requestId = readValue('request_id');
  const decision = readValue('decision');

  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }
  const detailPath = `/inventor/inventions/${inventionId}`;

  if (!requestId || (decision !== 'approve' && decision !== 'revoke')) {
    redirect(`${detailPath}?error=invalid_request`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_inventor_disclosure_approval', {
    _request_id: requestId,
    _approved: decision === 'approve'
  });

  if (error) {
    redirect(`${detailPath}?error=approval_failed`);
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=${decision === 'approve' ? 'disclosure_approved' : 'disclosure_revoked'}`);
}
