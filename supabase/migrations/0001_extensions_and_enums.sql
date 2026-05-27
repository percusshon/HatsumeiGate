-- Migration: 0001_extensions_and_enums
-- Purpose: Foundation layer (extensions + core enums) for Hatsumei Gate MVP
-- Notes:
-- - Non-destructive only: create/alter/additions only.
-- - RLS and seed data are not created in this migration set.
-- - enum additions should be additive only (avoid removing existing enum values).

-- Required extension
create extension if not exists pgcrypto;

-- app role
create type if not exists app_role as enum(
  'inventor',
  'operator',
  'reviewer',
  'patent_attorney_partner',
  'company_user',
  'company_admin',
  'company_legal_reviewer',
  'admin'
);

-- invention status lifecycle
create type if not exists invention_status as enum(
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

-- invention visibility and disclosure levels
create type if not exists invention_visibility_level as enum(
  'internal',
  'teaser',
  'nda_summary',
  'nda_detail',
  'negotiation_package'
);

create type if not exists disclosure_level as enum(
  'level_0_internal_only',
  'level_1_company_teaser',
  'level_2_nda_summary',
  'level_3_nda_detail',
  'level_4_negotiation_package'
);

-- deal status and type
create type if not exists deal_status as enum(
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

create type if not exists deal_type as enum(
  'complete_transfer',
  'exclusive_license',
  'non_exclusive_license',
  'joint_development',
  'proof_of_concept',
  'option'
);

-- IP strategy candidate values
create type if not exists ip_strategy_type as enum(
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

-- screening axes used in evaluation
create type if not exists screening_axis as enum(
  'novelty_hypothesis',
  'inventive_step_hypothesis',
  'market_need',
  'implementation_feasibility',
  'company_fit',
  'ip_risk',
  'disclosure_risk',
  'legal_safety_risk'
);

-- screening aggregate result (A-E)
create type if not exists screening_overall_rating as enum(
  'A',
  'B',
  'C',
  'D',
  'E'
);

-- file visibility scope for uploaded artifacts
create type if not exists file_visibility as enum(
  'none',
  'internal_only',
  'teaser',
  'nda_summary',
  'nda_detail',
  'negotiation_package',
  'public'
);

-- audit event type
create type if not exists audit_event_type as enum(
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

-- organization metadata
create type if not exists organization_type as enum(
  'internal',
  'enterprise',
  'creator',
  'startup',
  'school',
  'government',
  'other'
);

-- organization membership role
create type if not exists organization_member_role as enum(
  'owner',
  'manager',
  'member',
  'viewer'
);
