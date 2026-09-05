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
  provider: "razorpay_test" | "sandbox";
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
  | "retrigger_bank_leg"
  | "correct_destination"
  | "escalate_to_human";

export interface DiagnosisResult {
  likely_stage: "webhook_missing" | "bank_leg_stuck" | "invalid_destination" | "ledger_mismatch" | "ambiguous";
  confidence: number;
  recommended_action: AllowedAction;
  reasoning: string;
  evidence_used?: string[];
  provider: "gemini" | "nvidia" | "opencode" | "local_fallback" | "deterministic_heuristic";
  raw_response?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  action_to_take: AllowedAction;
  rule_triggered: string;
  reason: string;
  checks: {
    confidence_passed: boolean;
    amount_passed: boolean;
    remediation_limit_passed: boolean;
    allowed_action_passed: boolean;
    evidence_complete_passed: boolean;
  };
}

export interface ToolExecutionResult {
  tool_name: AllowedAction;
  case_id?: string;
  executed_at: string;
  success: boolean;
  output: string;
  payload?: Record<string, any>;
  provider_environment?: "RAZORPAY_TEST" | "SANDBOX";
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
  case_id: string;
  timestamp: string;
  actor?: "AGENT_CORE" | "POLICY_ENGINE" | "HUMAN_OPERATOR" | "SYSTEM" | string;
  stage: "DETECT" | "INVESTIGATE" | "DIAGNOSE" | "POLICY_GATE" | "ACT" | "VERIFY" | "OUTCOME";
  action?: string;
  provider?: string;
  message: string;
  status: "SUCCESS" | "WARNING" | "FAILURE" | "INFO";
  details?: Record<string, any>;
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
  high_value_threshold: number;
}
