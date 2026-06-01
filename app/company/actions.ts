'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

// NDA同意の記録は企業メンバーのみ（migration 0015 の nda_acceptances_insert_by_member に準拠）。
const COMPANY_ROLES = ['company_user', 'company_admin', 'company_legal_reviewer'];

export async function acceptNdaAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const companyAccountId = readValue('company_account_id');
  if (!companyAccountId) {
    redirect('/company?error=company_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => COMPANY_ROLES.includes(role))) {
    redirect('/company?error=forbidden');
  }

  const ndaVersion = readValue('nda_version');
  if (!ndaVersion) {
    redirect('/company?error=nda_version_required');
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('nda_acceptances').insert({
    company_account_id: companyAccountId,
    user_id: currentUser.id,
    accepted_by: currentUser.id,
    nda_version: ndaVersion
  });

  if (error) {
    redirect('/company?error=nda_failed');
  }

  revalidatePath('/company');
  redirect('/company?success=nda_accepted');
}
