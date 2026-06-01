'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  SCREENING_AXES,
  SCREENING_SCORE_MAX,
  SCREENING_SCORE_MIN,
  isScreeningRating
} from '@/lib/invention/screening';

// 審査レポートは operator / reviewer / admin が作成可能（migration 0014 のRLSに準拠）。
const SCREENING_ROLES = ['operator', 'reviewer', 'admin'];

export async function createScreeningReportAction(formData: FormData) {
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = read('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }

  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => SCREENING_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const overallRatingRaw = read('overall_rating');
  const overallRating =
    overallRatingRaw && isScreeningRating(overallRatingRaw) ? overallRatingRaw : null;
  const summary = read('summary');
  const recommendation = read('recommendation');
  const nextAction = read('next_action');

  // スコアは report 挿入前に検証し、不正値で孤立レポートを作らない。
  const pendingScores: Array<{ axis: string; score: number; rationale: string | null }> = [];
  for (const axis of SCREENING_AXES) {
    const raw = read(`score_${axis}`);
    if (raw === null || raw === '') {
      continue;
    }
    const score = Number(raw);
    if (!Number.isInteger(score) || score < SCREENING_SCORE_MIN || score > SCREENING_SCORE_MAX) {
      redirect(`${detailPath}?error=invalid_score`);
    }
    pendingScores.push({ axis, score, rationale: read(`rationale_${axis}`) || null });
  }

  if (!overallRating && !summary && !recommendation && !nextAction && pendingScores.length === 0) {
    redirect(`${detailPath}?error=empty_report`);
  }

  const supabase = createServerSupabaseClient();

  const { data: invention } = await supabase
    .from('inventions')
    .select('id')
    .eq('id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!invention) {
    redirect(`${detailPath}?error=not_found`);
  }

  const { data: report, error: reportError } = await supabase
    .from('invention_screening_reports')
    .insert({
      invention_id: inventionId,
      reviewer_id: currentUser.id,
      overall_rating: overallRating,
      summary: summary || null,
      recommendation: recommendation || null,
      next_action: nextAction || null,
      created_by: currentUser.id,
      updated_by: currentUser.id
    })
    .select('id')
    .single();

  if (reportError || !report) {
    redirect(`${detailPath}?error=report_failed`);
  }

  if (pendingScores.length > 0) {
    const scoreRows = pendingScores.map((row) => ({
      report_id: report.id,
      axis: row.axis,
      score: row.score,
      rationale: row.rationale,
      created_by: currentUser.id,
      updated_by: currentUser.id
    }));

    const { error: scoreError } = await supabase.from('invention_screening_scores').insert(scoreRows);
    if (scoreError) {
      redirect(`${detailPath}?error=score_failed`);
    }
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=report_created`);
}
