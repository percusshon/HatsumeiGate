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
