'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function createDraftAction(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const title = readValue('title') ?? '';
  const problem_summary = readValue('problem_summary');
  const solution_summary = readValue('solution_summary');
  const target_user = readValue('target_user');
  const use_case = readValue('use_case');
  const similar_products = readValue('similar_products');
  const prototype_status = readValue('prototype_status');
  const desired_outcome = readValue('desired_outcome');

  if (!title) {
    redirect('/inventor/inventions/new?error=title_required');
  }

  const payload = {
    inventor_id: user.id,
    created_by: user.id,
    updated_by: user.id,
    title,
    problem_summary: problem_summary || null,
    solution_summary: solution_summary || null,
    target_users: target_user || null,
    use_case: use_case || null,
    similar_products: similar_products || null,
    prototype_status: prototype_status || null,
    desired_outcome: desired_outcome || null,
    status: 'draft',
    visibility_level: 'internal',
    current_disclosure_level: 'level_0_internal_only'
  } as const;

  const { data: createdInvention, error } = await supabase
    .from('inventions')
    .insert(payload)
    .select('id')
    .single();

  if (error || !createdInvention) {
    redirect('/inventor/inventions/new?error=create_failed');
  }

  redirect(`/inventor/inventions/${createdInvention.id}`);
}

export async function updateDraftAction(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const inventionId = readValue('invention_id');
  const title = readValue('title') ?? '';
  const problem_summary = readValue('problem_summary');
  const solution_summary = readValue('solution_summary');
  const target_user = readValue('target_user');
  const use_case = readValue('use_case');
  const similar_products = readValue('similar_products');
  const prototype_status = readValue('prototype_status');
  const desired_outcome = readValue('desired_outcome');

  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }

  if (!title) {
    redirect(`/inventor/inventions/${inventionId}/edit?error=title_required`);
  }

  const { data: updated } = await supabase
    .from('inventions')
    .update({
      title,
      problem_summary: problem_summary || null,
      solution_summary: solution_summary || null,
      target_users: target_user || null,
      use_case: use_case || null,
      similar_products: similar_products || null,
      prototype_status: prototype_status || null,
      desired_outcome: desired_outcome || null,
      updated_by: user.id
    })
    .eq('id', inventionId)
    .eq('inventor_id', user.id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')
    .single();

  if (!updated) {
    redirect(`/inventor/inventions/${inventionId}/edit?error=update_failed`);
  }

  redirect(`/inventor/inventions/${inventionId}`);
}

export async function submitDraftAction(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const readBool = (key: string): boolean => {
    const value = formData.get(key);
    return value === 'true' || value === 'on';
  };

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }

  const isOriginalInventor = readBool('is_original_inventor');
  const hasCoInventors = readBool('has_co_inventors');
  const coInventorNotes = readValue('co_inventor_notes');
  const hasEmployerOrClientClaimRisk = readBool('has_employer_or_client_claim_risk');
  const employerOrClientNotes = readValue('employer_or_client_notes');
  const hasPublicDisclosure = readBool('has_public_disclosure');
  const publicDisclosureNotes = readValue('public_disclosure_notes');
  const includesThirdPartyMaterial = readBool('includes_third_party_material');
  const thirdPartyMaterialNotes = readValue('third_party_material_notes');
  const ndaPreDisclosureSummary = readValue('nda_pre_disclosure_summary');
  const confidentialDetailNotes = readValue('confidential_detail_notes');
  const acceptedTerms = readBool('accepted_terms');

  if (!isOriginalInventor) {
    redirect(`/inventor/inventions/${inventionId}/submit?error=not_original`);
  }

  if (!acceptedTerms) {
    redirect(`/inventor/inventions/${inventionId}/submit?error=terms_not_accepted`);
  }

  const { data: invention, error: inventionCheckError } = await supabase
    .from('inventions')
    .select('id, inventor_id, status')
    .eq('id', inventionId)
    .eq('inventor_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (inventionCheckError || !invention || invention.status !== 'draft') {
    redirect(`/inventor/inventions/${inventionId}/submit?error=invalid_invention`);
  }

  const { error: checkError } = await supabase.from('invention_submission_checks').insert({
    invention_id: inventionId,
    submitted_by: user.id,
    is_original_inventor: isOriginalInventor,
    has_co_inventors: hasCoInventors,
    co_inventor_notes: coInventorNotes || null,
    has_employer_or_client_claim_risk: hasEmployerOrClientClaimRisk,
    employer_or_client_notes: employerOrClientNotes || null,
    has_public_disclosure: hasPublicDisclosure,
    public_disclosure_notes: publicDisclosureNotes || null,
    includes_third_party_material: includesThirdPartyMaterial,
    third_party_material_notes: thirdPartyMaterialNotes || null,
    nda_pre_disclosure_summary: ndaPreDisclosureSummary || null,
    confidential_detail_notes: confidentialDetailNotes || null,
    accepted_terms: acceptedTerms,
    accepted_terms_at: new Date().toISOString(),
    created_by: user.id,
    updated_by: user.id
  });

  if (checkError) {
    redirect(`/inventor/inventions/${inventionId}/submit?error=check_save_failed`);
  }

  const { error: submitError, data: updatedInvention } = await supabase
    .from('inventions')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', inventionId)
    .eq('inventor_id', user.id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')
    .single();

  if (submitError || !updatedInvention) {
    redirect(`/inventor/inventions/${inventionId}/submit?error=submit_failed`);
  }

  const { error: eventError } = await supabase.from('invention_status_events').insert({
    invention_id: inventionId,
    from_status: 'draft',
    to_status: 'submitted',
    changed_by: user.id,
    reason: 'inventor submitted draft',
    visible_to_inventor: true
  });

  if (eventError) {
    redirect(`/inventor/inventions/${inventionId}?error=status_event_failed`);
  }

  redirect(`/inventor/inventions/${inventionId}`);
}
