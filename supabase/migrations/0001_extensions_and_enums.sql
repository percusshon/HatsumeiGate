-- Migration: 0001_extensions_and_enums
-- Purpose: Foundation layer (extensions + core enums) for Hatsumei Gate MVP
-- Notes:
-- - Non-destructive only: create/alter/additions only.
-- - RLS and seed data are not created in this migration set.
-- - enum additions should be additive only (avoid removing existing enum values).

-- Required extension
create extension if not exists pgcrypto;

-- app role
DO $$
BEGIN
  create type app_role as enum(
    'inventor',
    'operator',
    'reviewer',
    'patent_attorney_partner',
    'company_user',
    'company_admin',
    'company_legal_reviewer',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- invention status lifecycle
DO $$
BEGIN
  create type invention_status as enum(
    'draft',
    'submitted',
    'screening',
    'needs_more_info',
    'prior_art_research',
    'ip_strategy_review',
    'prototype_review',
    'attorney_review_ready',
    'company_disclosure_ready',
    'company_reviewing',
    'negotiating',
    'licensed',
    'assigned',
    'joint_development',
    'rejected',
    'withdrawn',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- invention visibility and disclosure levels
DO $$
BEGIN
  create type invention_visibility_level as enum(
    'internal',
    'teaser',
    'nda_summary',
    'nda_detail',
    'negotiation_package'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  create type disclosure_level as enum(
    'level_0_internal_only',
    'level_1_company_teaser',
    'level_2_nda_summary',
    'level_3_nda_detail',
    'level_4_negotiation_package'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- deal status and type
DO $$
BEGIN
  create type deal_status as enum(
    'no_interest',
    'interested',
    'nda_requested',
    'nda_accepted',
    'meeting_requested',
    'meeting_completed',
    'evaluating',
    'terms_proposed',
    'negotiating',
    'licensed',
    'assigned',
    'joint_development',
    'declined',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  create type deal_type as enum(
    'complete_transfer',
    'exclusive_license',
    'non_exclusive_license',
    'joint_development',
    'proof_of_concept',
    'option'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- IP strategy candidate values
DO $$
BEGIN
  create type ip_strategy_type as enum(
    'patent',
    'utility_model',
    'design_right',
    'trademark',
    'copyright',
    'trade_secret',
    'open_source',
    'defensive_publication',
    'no_ip_action',
    'redesign_required'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- screening axes used in evaluation
DO $$
BEGIN
  create type screening_axis as enum(
    'novelty_hypothesis',
    'inventive_step_hypothesis',
    'market_need',
    'implementation_feasibility',
    'company_fit',
    'ip_risk',
    'disclosure_risk',
    'legal_safety_risk'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- screening aggregate result (A-E)
DO $$
BEGIN
  create type screening_overall_rating as enum(
    'A',
    'B',
    'C',
    'D',
    'E'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- file visibility scope for uploaded artifacts
DO $$
BEGIN
  create type file_visibility as enum(
    'none',
    'internal_only',
    'teaser',
    'nda_summary',
    'nda_detail',
    'negotiation_package',
    'public'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- audit event type
DO $$
BEGIN
  create type audit_event_type as enum(
    'invention_submit',
    'invention_update',
    'invention_status_changed',
    'submission_check_saved',
    'file_uploaded',
    'file_viewed',
    'file_downloaded',
    'screening_report_saved',
    'prior_art_item_updated',
    'ip_strategy_note_updated',
    'company_disclosure_request',
    'nda_requested',
    'nda_accepted',
    'company_invention_viewed',
    'deal_status_changed',
    'deal_terms_updated',
    'revenue_recorded',
    'admin_action'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- organization metadata
DO $$
BEGIN
  create type organization_type as enum(
    'internal',
    'enterprise',
    'creator',
    'startup',
    'school',
    'government',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- organization membership role
DO $$
BEGIN
  create type organization_member_role as enum(
    'owner',
    'manager',
    'member',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
