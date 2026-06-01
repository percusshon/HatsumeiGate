'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isCompanyReviewAction } from '@/lib/company/review';

// company_accounts の審査更新は operator/admin のみ（migration 0014 のRLSに準拠）。
const OPERATOR_ROLES = ['operator', 'admin'];

export async function reviewCompanyAccountAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const companyAccountId = readValue('company_account_id');
  if (!companyAccountId) {
    redirect('/operator/companies?error=company_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/companies?error=forbidden');
  }

  const reviewStatusRaw = readValue('review_status');
  if (!reviewStatusRaw || !isCompanyReviewAction(reviewStatusRaw)) {
    redirect('/operator/companies?error=invalid_status');
  }
  const reviewNote = readValue('review_note');

  const supabase = createServerSupabaseClient();

  const { data: updated, error } = await supabase
    .from('company_accounts')
    .update({
      review_status: reviewStatusRaw,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
      updated_by: currentUser.id
    })
    .eq('id', companyAccountId)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (error || !updated) {
    redirect('/operator/companies?error=update_failed');
  }

  revalidatePath('/operator/companies');
  redirect('/operator/companies?success=reviewed');
}
