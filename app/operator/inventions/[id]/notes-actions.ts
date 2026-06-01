'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isIpStrategyType, isPriorArtRiskLevel } from '@/lib/invention/ip-strategy';

// prior_art_items / ip_strategy_notes は operator/reviewer/admin が作成可能（migration 0014）。
const INTERNAL_ROLES = ['operator', 'reviewer', 'admin'];

function readValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : null;
}

async function requireInternalUser(detailPath: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => INTERNAL_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }
  return currentUser;
}

async function ensureInventionVisible(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  inventionId: string,
  detailPath: string
) {
  const { data: invention } = await supabase
    .from('inventions')
    .select('id')
    .eq('id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!invention) {
    redirect(`${detailPath}?error=not_found`);
  }
}

export async function createPriorArtItemAction(formData: FormData) {
  const inventionId = readValue(formData, 'invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }
  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await requireInternalUser(detailPath);

  const title = readValue(formData, 'title');
  const sourceUrl = readValue(formData, 'source_url');
  const sourceType = readValue(formData, 'source_type');
  const publicationIdentifier = readValue(formData, 'publication_identifier');
  const summary = readValue(formData, 'summary');
  const relevanceNote = readValue(formData, 'relevance_note');
  const riskLevelRaw = readValue(formData, 'risk_level');
  const riskLevel = riskLevelRaw && isPriorArtRiskLevel(riskLevelRaw) ? riskLevelRaw : null;

  if (!title && !sourceUrl && !summary) {
    redirect(`${detailPath}?error=empty_prior_art`);
  }

  const supabase = createServerSupabaseClient();
  await ensureInventionVisible(supabase, inventionId, detailPath);

  const { error } = await supabase.from('prior_art_items').insert({
    invention_id: inventionId,
    title: title || null,
    source_url: sourceUrl || null,
    source_type: sourceType || null,
    publication_identifier: publicationIdentifier || null,
    summary: summary || null,
    relevance_note: relevanceNote || null,
    risk_level: riskLevel,
    created_by: currentUser.id,
    updated_by: currentUser.id
  });

  if (error) {
    redirect(`${detailPath}?error=prior_art_failed`);
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=prior_art_created`);
}

export async function createIpStrategyNoteAction(formData: FormData) {
  const inventionId = readValue(formData, 'invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }
  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await requireInternalUser(detailPath);

  const strategyTypeRaw = readValue(formData, 'strategy_type');
  if (!strategyTypeRaw || !isIpStrategyType(strategyTypeRaw)) {
    redirect(`${detailPath}?error=strategy_type_required`);
  }
  const note = readValue(formData, 'note');
  const requiresAttorneyReview = formData.get('requires_attorney_review') === 'on';

  const supabase = createServerSupabaseClient();
  await ensureInventionVisible(supabase, inventionId, detailPath);

  const { error } = await supabase.from('ip_strategy_notes').insert({
    invention_id: inventionId,
    strategy_type: strategyTypeRaw,
    note: note || null,
    requires_attorney_review: requiresAttorneyReview,
    created_by: currentUser.id,
    updated_by: currentUser.id
  });

  if (error) {
    redirect(`${detailPath}?error=ip_strategy_failed`);
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=ip_strategy_created`);
}
