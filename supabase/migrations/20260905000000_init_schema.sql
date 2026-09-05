-- Supabase Postgres Migration: 20260905000000_init_schema.sql
-- Refund Loop Production Schema (Multi-Tenant Workspace Scoped with RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'sandbox',
    autonomy_mode TEXT NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    confidence_threshold NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
    high_value_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    allowed_actions JSONB NOT NULL DEFAULT '["resend_webhook", "reconcile_state", "refresh_status", "verify_refund"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

-- 2. PROFILES (Users mapped to Auth & Workspaces)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. REFUNDS (Stuck / Active Refund Cases)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    refund_id TEXT NOT NULL,
    payment_id TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    merchant_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_vpa_or_account TEXT,
    current_status TEXT NOT NULL DEFAULT 'LIMBO',
    failure_class TEXT NOT NULL DEFAULT 'WEBHOOK_MISSING',
    is_planted_failure BOOLEAN NOT NULL DEFAULT FALSE,
    remediation_attempts INTEGER NOT NULL DEFAULT 0,
    age_days INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_case UNIQUE(workspace_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_refunds_workspace_id ON public.refunds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(current_status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);

-- 4. REFUND EVIDENCE (5-Subsystem Cross-Correlation Data)
CREATE TABLE IF NOT EXISTS public.refund_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    gateway_status TEXT NOT NULL,
    bank_status TEXT NOT NULL,
    webhook_status TEXT NOT NULL,
    destination_status TEXT NOT NULL,
    ledger_status TEXT NOT NULL,
    has_conflicting_signals BOOLEAN NOT NULL DEFAULT FALSE,
    conflict_summary TEXT,
    event_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_evidence_workspace ON public.refund_evidence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_refund_evidence_refund ON public.refund_evidence(refund_id);

-- 5. AGENT RUNS (Closed-Loop Lifecycle Executions)
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    value_resolved NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_status TEXT NOT NULL DEFAULT 'INVESTIGATING',
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON public.agent_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_refund ON public.agent_runs(refund_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

-- 6. AGENT DIAGNOSES (Real External Model Invocations)
CREATE TABLE IF NOT EXISTS public.agent_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    likely_stage TEXT NOT NULL,
    confidence NUMERIC(4, 2) NOT NULL,
    recommended_action TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    evidence_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_response TEXT,
    error TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_diagnoses_workspace ON public.agent_diagnoses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_diagnoses_run ON public.agent_diagnoses(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_diagnoses_created_at ON public.agent_diagnoses(created_at DESC);

-- 7. AGENT ACTIONS (Executed Bounded Remediations)
CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    executed_by TEXT NOT NULL DEFAULT 'AGENT_CORE',
    provider_environment TEXT NOT NULL DEFAULT 'SANDBOX',
    success BOOLEAN NOT NULL DEFAULT FALSE,
    output TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_workspace ON public.agent_actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_run ON public.agent_actions(run_id);

-- 8. AGENT VERIFICATIONS (Outcome State Verification)
CREATE TABLE IF NOT EXISTS public.agent_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
    observed_status TEXT NOT NULL,
    remediation_effective BOOLEAN NOT NULL DEFAULT FALSE,
    details TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_verifications_workspace ON public.agent_verifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_verifications_run ON public.agent_verifications(run_id);

-- 9. AUDIT EVENTS (Cryptographically Linked Append-Only Tamper-Evident Hash Chain)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
    case_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'AGENT_CORE',
    stage TEXT NOT NULL,
    action TEXT NOT NULL,
    provider TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'INFO',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON public.audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_case_id ON public.audit_events(case_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID AS $$
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can access own workspace" ON public.workspaces
    FOR ALL USING (id = public.current_user_workspace_id());

CREATE POLICY "Users can access own profile" ON public.profiles
    FOR ALL USING (workspace_id = public.current_user_workspace_id() OR id = auth.uid());

CREATE POLICY "Users can access workspace refunds" ON public.refunds
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace evidence" ON public.refund_evidence
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace agent runs" ON public.agent_runs
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace agent diagnoses" ON public.agent_diagnoses
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace agent actions" ON public.agent_actions
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace agent verifications" ON public.agent_verifications
    FOR ALL USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Users can access workspace audit events" ON public.audit_events
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
