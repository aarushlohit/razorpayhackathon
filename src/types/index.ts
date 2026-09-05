export type FailureClass =
  | "WEBHOOK_MISSING"
  | "BANK_LEG_STUCK"
  | "INVALID_DESTINATION"
  | "LEDGER_MISMATCH"
  | "AMBIGUOUS";

export type CaseStatus =
  | "LIMBO"
  | "INVESTIGATING"
  | "ACTION_IN_PROGRESS"
  | "VERIFYING"
  | "RESOLVED"
  | "ESCALATED_LOW_CONFIDENCE"
  | "ESCALATED_HIGH_VALUE"
  | "ESCALATED_FAILED_REMEDIATION"
  | "ESCALATED_MAX_REMEDIATIONS"
  | "ESCALATED_HUMAN";

export type AutonomyMode = "OBSERVE" | "APPROVAL_REQUIRED" | "AUTONOMOUS";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  role: "admin" | "operator" | "viewer";
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  provider: "razorpay_live" | "sandbox";
  autonomy_mode: AutonomyMode;
  confidence_threshold: number;
  high_value_limit: number;
  max_attempts: number;
  allowed_actions: AllowedAction[];
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  workspace_id: string;
  expires_at: number;
}

export interface EventTrailItem {
  id: string;
  timestamp: string;
  event_type: string;
  system: "GATEWAY" | "NPCI_BANK" | "WEBHOOK_DISPATCHER" | "MERCHANT_LEDGER" | "BENEFICIARY_VALIDATOR";
  status: "SUCCESS" | "PENDING" | "FAILED" | "TIMEOUT";
  details: string;
}

export interface EvidencePackage {
  case_id?: string;
  gateway_status: "ACKNOWLEDGED" | "PENDING" | "FAILED";
  bank_status: "PENDING_SWITCH" | "NO_UPDATE" | "CREDIT_CONFIRMED" | "REJECTED";
  webhook_status: "DELIVERED" | "FAILED_TIMEOUT" | "500_SERVER_ERROR" | "NOT_DISPATCHED";
  destination_status: "VALID_ACTIVE" | "BENEFICIARY_BLOCKED" | "INVALID_IFSC" | "VPA_DECOMMISSIONED";
  ledger_status: "REFUNDED" | "MISMATCH_PENDING" | "SETTLEMENT_HOLD";
  event_trail: EventTrailItem[];
  age_days: number;
  amount: number;
  currency: string;
  has_conflicting_signals: boolean;
  conflict_summary?: string;
}

export type AllowedAction =
  | "resend_webhook"
  | "reconcile_state"
  | "refresh_status"
  | "verify_refund"
  | "escalate_to_human";

export interface EvidenceEvaluation {
  source: string;
  observed: string;
  interpretation: string;
  supports: boolean;
}

export interface Hypothesis {
  label: string;
  confidence: number;
  code?: string;
}

export interface AIAssessment {
  primary_hypothesis: {
    code: string;
    label: string;
    confidence: number;
  };
  summary: string;
  evidence: EvidenceEvaluation[];
  alternative_hypotheses: Hypothesis[];
  recommended_action: {
    action: AllowedAction;
    reason: string;
  };
  uncertainty?: string;
}

export interface DiagnosisResult {
  likely_stage: "webhook_missing" | "bank_leg_stuck" | "invalid_destination" | "ledger_mismatch" | "ambiguous" | null;
  confidence: number | null;
  recommended_action: AllowedAction | null;
  reasoning: string | null;
  evidence_used?: string[];
  assessment?: AIAssessment | null;
  provider: "gemini" | "nvidia" | "opencode" | "AI_UNAVAILABLE" | string;
  model?: string | null;
  raw_response?: string | null;
  error?: string | null;
  latency_ms?: number;
}

export interface PolicyRuleEvaluation {
  id: string; // e.g. "RULE_01_CONFIDENCE"
  name: string;
  passed: boolean;
  observed: string;
  threshold: string;
  reason: string;
}

export interface PolicyDecision {
  evaluation_id: string;
  decision: "ALLOW" | "HALT" | "HUMAN_REVIEW";
  allowed: boolean;
  action_to_take: AllowedAction;
  rule_triggered: string;
  reason: string;
  authorization_id?: string;
  evaluated_at: string;
  rules: PolicyRuleEvaluation[];
  checks: {
    confidence_passed: boolean;
    amount_passed: boolean;
    remediation_limit_passed: boolean;
    allowed_action_passed: boolean;
    evidence_complete_passed: boolean;
    action_compatibility_passed?: boolean;
    case_state_passed?: boolean;
    workspace_isolation_passed?: boolean;
    provider_state_passed?: boolean;
    approved_tool_passed?: boolean;
  };
}

export interface ExecutionAuthorization {
  authorization_id: string;
  evaluation_id: string;
  case_id: string;
  workspace_id: string;
  action: AllowedAction;
  created_at: number;
  expires_at: number;
  consumed: boolean;
  consumed_at?: number;
  consumed_by?: string;
  snapshot_hash: string;
}

export interface PolicyEvaluationRecord {
  evaluation_id: string;
  case_id: string;
  workspace_id: string;
  confidence: number;
  amount: number;
  requested_action: AllowedAction;
  decision: "ALLOW" | "HALT" | "HUMAN_REVIEW";
  rule_triggered: string;
  reason: string;
  authorization_id?: string;
  rules: PolicyRuleEvaluation[];
  evaluated_at: string;
}

export interface ToolExecutionResult {
  tool_name: AllowedAction;
  case_id?: string;
  executed_at: string;
  success: boolean;
  output: string;
  payload?: Record<string, any>;
  provider_environment?: "RAZORPAY_LIVE" | "RAZORPAY_TEST" | "DEVELOPMENT_SANDBOX" | "SANDBOX";
}

export interface OutcomeVerification {
  verified_at: string;
  observed_status: "RESOLVED" | "STILL_PENDING" | "FAILED";
  remediation_effective: boolean;
  details: string;
}

export interface RefundCase {
  id?: string;
  case_id: string;
  workspace_id?: string;
  refund_id: string;
  amount: number;
  currency: "INR" | "USD" | string;
  created_at: string;
  updated_at?: string;
  merchant_id: string;
  merchant_name: string;
  customer_id: string;
  customer_name: string;
  customer_vpa_or_account: string;
  current_status: CaseStatus;
  failure_class: FailureClass;
  is_planted_failure: boolean;
  remediation_attempts: number;
  age_days: number;
  evidence: EvidencePackage;
  latest_diagnosis?: DiagnosisResult;
  latest_policy?: PolicyDecision;
  latest_action?: ToolExecutionResult;
  latest_verification?: OutcomeVerification;
}

export interface AuditLogEntry {
  id: string;
  workspace_id?: string;
  run_id?: string;
  case_id: string;
  timestamp: string;
  actor?: "AGENT_CORE" | "POLICY_ENGINE" | "HUMAN_OPERATOR" | "SYSTEM" | string;
  stage: "DETECT" | "INVESTIGATE" | "DIAGNOSE" | "POLICY_GATE" | "ACT" | "VERIFY" | "OUTCOME";
  action?: string;
  provider?: string;
  message: string;
  status: "SUCCESS" | "WARNING" | "FAILURE" | "INFO";
  details?: Record<string, any>;
  previous_hash?: string;
  event_hash?: string;
}

export interface SandboxConfig {
  seed: number;
  difficulty: "easy" | "normal" | "ambiguous";
  count: number;
}

export interface SimulatorConfig {
  seed: number;
  difficulty: "easy" | "normal" | "ambiguous";
  count: number;
  confidence_threshold: number;
  high_value_limit?: number;
  high_value_threshold?: number;
}

export type IntegrationProvider = "razorpay" | "gemini" | "nvidia" | "opencode" | "supabase";
export type IntegrationMode = "test" | "live";
export type IntegrationStatus = "connected" | "not_connected" | "invalid_credentials" | "connection_failed" | "error";

export interface EncryptedSecretRecord {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  provider: "razorpay" | string;
  mode: IntegrationMode;
  key_id: string;
  encrypted_key_secret: EncryptedSecretRecord;
  encrypted_webhook_secret?: EncryptedSecretRecord;
  status: IntegrationStatus;
  last_validated_at: string;
  created_at: string;
  updated_at: string;
}

export interface PublicIntegrationStatus {
  connected: boolean;
  provider: string;
  mode: IntegrationMode | null;
  status: IntegrationStatus;
  key_id_masked: string | null;
  has_webhook_secret: boolean;
  last_validated_at: string | null;
  capabilities: string[];
}

