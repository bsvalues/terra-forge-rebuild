-- Phase 66: Data Quality Command Center (DQCC) Schema
-- "The database said it feels better already" — Ralph Wiggum, MD

-- Enable pg_trgm for fuzzy string matching (duplicate detection)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Remediation lane enum
CREATE TYPE public.dq_lane AS ENUM (
  'spatial_healing',
  'address_normalization',
  'orphan_duplicate',
  'cross_source_reconciliation',
  'characteristic_inference',
  'value_anomaly'
);

-- Issue severity enum
CREATE TYPE public.dq_severity AS ENUM ('critical', 'high', 'medium', 'low');

-- Fix tier enum  
CREATE TYPE public.dq_fix_tier AS ENUM ('auto_apply', 'review_confirm', 'human_resolve');

-- ══════════════════════════════════════════════════════════════
-- Issue Registry: every data quality issue detected
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.dq_issue_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  lane public.dq_lane NOT NULL,
  severity public.dq_severity NOT NULL DEFAULT 'medium',
  fix_tier public.dq_fix_tier NOT NULL DEFAULT 'review_confirm',
  
  -- What's broken
  issue_type TEXT NOT NULL,           -- e.g. 'srid_mismatch', 'missing_situs', 'duplicate_parcel'
  issue_title TEXT NOT NULL,          -- Human-readable title
  issue_description TEXT,             -- AI-generated explanation
  
  -- Affected scope
  affected_parcel_ids UUID[] DEFAULT '{}',
  affected_count INT NOT NULL DEFAULT 0,
  sample_parcel_ids UUID[] DEFAULT '{}',  -- Up to 10 examples
  
  -- Scoring
  impact_score NUMERIC(5,2) DEFAULT 0,        -- 0-100: roll effect
  confidence_score NUMERIC(5,2) DEFAULT 0,    -- 0-100: certainty of fix
  reversibility_score NUMERIC(5,2) DEFAULT 0, -- 0-100: ease of rollback
  priority_score NUMERIC(5,2) GENERATED ALWAYS AS (
    (impact_score * 0.5) + (confidence_score * 0.3) + (reversibility_score * 0.2)
  ) STORED,
  
  -- Source trust
  source_trust_level TEXT,            -- e.g. 'recorded_deed', 'county_gis', 'cama_certified', 'ai_inference'
  source_explanation TEXT,            -- Why this source was trusted
  
  -- Hard blocker flag
  is_hard_blocker BOOLEAN DEFAULT false,
  blocker_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed', 'deferred')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  -- Metadata
  diagnosis_run_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dq_issues_county ON public.dq_issue_registry(county_id);
CREATE INDEX idx_dq_issues_lane ON public.dq_issue_registry(lane);
CREATE INDEX idx_dq_issues_status ON public.dq_issue_registry(status);
CREATE INDEX idx_dq_issues_priority ON public.dq_issue_registry(priority_score DESC);
CREATE INDEX idx_dq_issues_blocker ON public.dq_issue_registry(is_hard_blocker) WHERE is_hard_blocker = true;

-- ══════════════════════════════════════════════════════════════
-- Proposed Fixes: AI/engine-suggested corrections
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.dq_proposed_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.dq_issue_registry(id) ON DELETE CASCADE,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  
  -- What to fix
  parcel_id UUID REFERENCES public.parcels(id),
  target_table TEXT NOT NULL DEFAULT 'parcels',
  target_column TEXT NOT NULL,
  current_value TEXT,
  proposed_value TEXT,
  
  -- Fix metadata
  fix_method TEXT NOT NULL,           -- e.g. 'st_transform', 'address_normalize', 'source_quorum'
  fix_tier public.dq_fix_tier NOT NULL,
  confidence NUMERIC(5,2) DEFAULT 0,
  source_trust TEXT,
  explanation TEXT,                   -- AI explanation of why this fix is recommended
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rejected', 'rolled_back')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  batch_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dq_fixes_issue ON public.dq_proposed_fixes(issue_id);
CREATE INDEX idx_dq_fixes_county ON public.dq_proposed_fixes(county_id);
CREATE INDEX idx_dq_fixes_status ON public.dq_proposed_fixes(status);
CREATE INDEX idx_dq_fixes_parcel ON public.dq_proposed_fixes(parcel_id);

-- ══════════════════════════════════════════════════════════════
-- Remediation Batches: grouped fix applications with rollback
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.dq_remediation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  
  lane public.dq_lane NOT NULL,
  fix_tier public.dq_fix_tier NOT NULL,
  batch_name TEXT NOT NULL,
  
  -- Stats
  total_fixes INT NOT NULL DEFAULT 0,
  applied_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  rolled_back_count INT NOT NULL DEFAULT 0,
  
  -- Quality delta
  quality_score_before NUMERIC(5,2),
  quality_score_after NUMERIC(5,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applying', 'applied', 'partially_applied', 'rolled_back', 'failed')),
  applied_by UUID,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  
  -- Rollback manifest (stores original values)
  rollback_manifest JSONB DEFAULT '[]',
  
  -- Audit
  trace_event_id TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dq_batches_county ON public.dq_remediation_batches(county_id);
CREATE INDEX idx_dq_batches_status ON public.dq_remediation_batches(status);

-- ══════════════════════════════════════════════════════════════
-- Diagnosis Runs: track each AI diagnosis execution
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.dq_diagnosis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  
  -- Results
  total_issues_found INT NOT NULL DEFAULT 0,
  hard_blockers_found INT NOT NULL DEFAULT 0,
  lanes_analyzed TEXT[] DEFAULT '{}',
  
  -- Quality snapshot at diagnosis time
  quality_snapshot JSONB DEFAULT '{}',
  treatment_plan JSONB DEFAULT '{}',
  
  -- AI model info
  model_used TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dq_runs_county ON public.dq_diagnosis_runs(county_id);

-- ══════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.dq_issue_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_proposed_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_remediation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_diagnosis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dq_issue_registry" ON public.dq_issue_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read dq_proposed_fixes" ON public.dq_proposed_fixes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read dq_remediation_batches" ON public.dq_remediation_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read dq_diagnosis_runs" ON public.dq_diagnosis_runs FOR SELECT TO authenticated USING (true);

-- Service role (edge functions) can write
CREATE POLICY "Service can manage dq_issue_registry" ON public.dq_issue_registry FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage dq_proposed_fixes" ON public.dq_proposed_fixes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage dq_remediation_batches" ON public.dq_remediation_batches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage dq_diagnosis_runs" ON public.dq_diagnosis_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime for live diagnosis tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.dq_diagnosis_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dq_issue_registry;