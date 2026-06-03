'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isCompanyReviewAction } from '@/lib/company/review';

// company_accounts の審査更新は operator/admin のみ（migration 0014 のRLSに準拠）。
const OPERATOR_ROLES = ['operator', 'admin'];

const COMPANY_MEMBER_ROLES = ['company_user', 'company_admin', 'company_legal_reviewer'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// 企業メンバーの付与（operator/admin のみ、migration 0014 の company_members_mutate_ops_admin）。
export async function addCompanyMemberAction(formData: FormData) {
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

  const userId = readValue('user_id');
  if (!userId || !UUID_RE.test(userId)) {
    redirect('/operator/companies?error=member_user_invalid');
  }

  const role = readValue('member_role');
  if (!role || !COMPANY_MEMBER_ROLES.includes(role)) {
    redirect('/operator/companies?error=member_role_invalid');
  }

  const supabase = createServerSupabaseClient();

  // 重複付与を避ける（同一 company×user×role の有効レコード）。
  const { data: existing } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_account_id', companyAccountId)
    .eq('user_id', userId)
    .eq('role', role)
    .is('deleted_at', null)
    .maybeSingle();
  if (existing) {
    redirect('/operator/companies?error=member_exists');
  }

  const { error } = await supabase.from('company_members').insert({
    company_account_id: companyAccountId,
    user_id: userId,
    role,
    created_by: currentUser.id
  });

  if (error) {
    redirect('/operator/companies?error=member_add_failed');
  }

  revalidatePath('/operator/companies');
  redirect('/operator/companies?success=member_added');
}
