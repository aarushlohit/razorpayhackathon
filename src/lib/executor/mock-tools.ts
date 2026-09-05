import { RefundStore } from "../simulator/store";
import type { ToolExecutionResult, OutcomeVerification, AllowedAction, EventTrailItem, CaseStatus } from "../../types/index";

export const MockTools = {
  pull_event_trail(caseId: string): EventTrailItem[] {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found in store.`);
    return refundCase.evidence.event_trail;
  },

  resend_webhook(caseId: string): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    refundCase.remediation_attempts += 1;
    refundCase.evidence.webhook_status = "DELIVERED";
    refundCase.current_status = "ACTION_IN_PROGRESS";

    const newEvent: EventTrailItem = {
      id: `evt_act_wh_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "WEBHOOK_DISPATCHER",
      event_type: "agent_webhook_redeliver",
      status: "SUCCESS",
      details: "Agent re-dispatched signed HMAC webhook payload; received HTTP 200 OK from merchant listener.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "resend_webhook",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Merchant webhook redelivered successfully with HTTP 200 OK acknowledgement.",
      payload: { webhook_status: "DELIVERED", retry_count: 1 },
    };
  },

  refresh_status(caseId: string): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    refundCase.remediation_attempts += 1;
    refundCase.current_status = "ACTION_IN_PROGRESS";

    if (refundCase.is_planted_failure) {
      refundCase.evidence.bank_status = "NO_UPDATE";
      const newEvent: EventTrailItem = {
        id: `evt_act_planted_${Date.now()}`,
        timestamp: new Date().toISOString(),
        system: "GATEWAY",
        event_type: "gateway_status_sync",
        status: "FAILED",
        details: "Gateway status synchronization returned UNRESOLVED_PENDING status.",
      };
      refundCase.evidence.event_trail.push(newEvent);
      RefundStore.updateCase(refundCase);

      return {
        tool_name: "refresh_status",
        case_id: caseId,
        executed_at: new Date().toISOString(),
        success: true,
        output: "Queried payment gateway status. Gateway reports transaction remains in processing limbo.",
        payload: { state: "UNRESOLVED_PENDING" },
      };
    }

    refundCase.evidence.bank_status = "CREDIT_CONFIRMED";
    refundCase.evidence.gateway_status = "ACKNOWLEDGED";
    const newEvent: EventTrailItem = {
      id: `evt_act_sync_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "GATEWAY",
      event_type: "gateway_status_sync",
      status: "SUCCESS",
      details: "Queried downstream gateway state; confirmed payment reversal terminal status.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "refresh_status",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Refreshed gateway status. Confirmed refund terminal status.",
      payload: { status: "PROCESSED" },
    };
  },

  reconcile_state(caseId: string): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    refundCase.remediation_attempts += 1;
    refundCase.evidence.ledger_status = "REFUNDED";
    refundCase.current_status = "ACTION_IN_PROGRESS";

    const newEvent: EventTrailItem = {
      id: `evt_act_rec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "MERCHANT_LEDGER",
      event_type: "ledger_reconciliation_sync",
      status: "SUCCESS",
      details: "Merchant accounting ledger synchronized with gateway settlement batch.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "reconcile_state",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Merchant ledger state reconciled with gateway records.",
      payload: { ledger_status: "REFUNDED" },
    };
  },

  escalate_to_human(caseId: string, reason: string, specificStatus?: CaseStatus): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    const targetStatus = specificStatus || "ESCALATED_HUMAN";
    refundCase.current_status = targetStatus;

    const newEvent: EventTrailItem = {
      id: `evt_act_esc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "GATEWAY",
      event_type: "routed_to_ops_escalation",
      status: "PENDING",
      details: `Escalated to Human Ops Review Queue. Reason: ${reason}`,
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "escalate_to_human",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: `Case escalated to Human Operations Queue [Status: ${targetStatus}].`,
      payload: { reason, status: targetStatus },
    };
  },

  verify_refund_status(caseId: string): OutcomeVerification {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    if (refundCase.is_planted_failure && refundCase.evidence.bank_status !== "CREDIT_CONFIRMED") {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "STILL_PENDING",
        remediation_effective: false,
        details: "CRITICAL: Downstream settlement status remains unresolved. State did not mutate after remediation attempt.",
      };
    }

    const { gateway_status, bank_status, webhook_status } = refundCase.evidence;

    const isResolved =
      gateway_status === "ACKNOWLEDGED" &&
      bank_status === "CREDIT_CONFIRMED" &&
      webhook_status === "DELIVERED";

    if (isResolved) {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "RESOLVED",
        remediation_effective: true,
        details: "Verification succeeded: All payment records (Gateway, Settlement Status, Webhook Delivery) are synchronized and terminal.",
      };
    }

    return {
      verified_at: new Date().toISOString(),
      observed_status: "STILL_PENDING",
      remediation_effective: false,
      details: `Verification incomplete: Bank=${bank_status}, Webhook=${webhook_status}.`,
    };
  },
};
