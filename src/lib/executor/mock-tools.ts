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

  retrigger_bank_leg(caseId: string): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    refundCase.remediation_attempts += 1;
    refundCase.current_status = "ACTION_IN_PROGRESS";

    if (refundCase.is_planted_failure) {
      // Planted failure: bank switch rejects retrigger or keeps in NO_UPDATE!
      refundCase.evidence.bank_status = "NO_UPDATE";
      const newEvent: EventTrailItem = {
        id: `evt_act_bank_planted_${Date.now()}`,
        timestamp: new Date().toISOString(),
        system: "NPCI_BANK",
        event_type: "bank_switch_retrigger_attempt",
        status: "FAILED",
        details: "Acquiring switch returned error: ERR_SETTLEMENT_REVERSAL_EXHAUSTED (Beneficiary bank gateway timeout).",
      };
      refundCase.evidence.event_trail.push(newEvent);
      RefundStore.updateCase(refundCase);

      return {
        tool_name: "retrigger_bank_leg",
        case_id: caseId,
        executed_at: new Date().toISOString(),
        success: true, // tool executed, but outcome verification will catch the failure!
        output: "Dispatched bank switch retrigger command. Switch accepted instruction.",
        payload: { instruction: "RETRY_DISPATCH", batch_id: `bt_${Date.now()}` },
      };
    }

    // Normal successful case
    refundCase.evidence.bank_status = "CREDIT_CONFIRMED";
    const newEvent: EventTrailItem = {
      id: `evt_act_bank_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "NPCI_BANK",
      event_type: "bank_switch_retrigger_success",
      status: "SUCCESS",
      details: "Beneficiary bank processed forced reversal; assigned RRN_CONFIRMATION callback.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "retrigger_bank_leg",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Dispatched bank switch reversal request. RRN confirmation received.",
      payload: { status: "CREDIT_CONFIRMED" },
    };
  },

  correct_destination(caseId: string): ToolExecutionResult {
    const refundCase = RefundStore.getCase(caseId);
    if (!refundCase) throw new Error(`Case ${caseId} not found.`);

    refundCase.remediation_attempts += 1;
    refundCase.evidence.destination_status = "VALID_ACTIVE";
    refundCase.evidence.bank_status = "CREDIT_CONFIRMED";
    refundCase.customer_vpa_or_account = `${refundCase.customer_name.toLowerCase().replace(/\s+/g, ".")}verified@icici`;
    refundCase.current_status = "ACTION_IN_PROGRESS";

    const newEvent: EventTrailItem = {
      id: `evt_act_dest_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "BENEFICIARY_VALIDATOR",
      event_type: "destination_corrected_and_re-routed",
      status: "SUCCESS",
      details: `Destination re-routed to validated customer secondary VPA (${refundCase.customer_vpa_or_account}). Account confirmed active.`,
    };
    refundCase.evidence.event_trail.push(newEvent);
    RefundStore.updateCase(refundCase);

    return {
      tool_name: "correct_destination",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: `Updated destination routing token to validated fallback handle ${refundCase.customer_vpa_or_account}.`,
      payload: { destination_status: "VALID_ACTIVE" },
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

    // Check actual state in synthetic DB:
    // If it's a planted failure case: bank_status remains NO_UPDATE!
    if (refundCase.is_planted_failure && refundCase.evidence.bank_status !== "CREDIT_CONFIRMED") {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "STILL_PENDING",
        remediation_effective: false,
        details: "CRITICAL: Acquiring switch still reports unconfirmed status. Bank leg did not resolve after remediation attempt.",
      };
    }

    const { gateway_status, bank_status, webhook_status, destination_status } = refundCase.evidence;

    const isResolved =
      gateway_status === "ACKNOWLEDGED" &&
      bank_status === "CREDIT_CONFIRMED" &&
      webhook_status === "DELIVERED" &&
      destination_status === "VALID_ACTIVE";

    if (isResolved) {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "RESOLVED",
        remediation_effective: true,
        details: "Verification succeeded: All payment legs (Gateway, Bank RRN, Webhook ACK, Destination) are fully closed.",
      };
    }

    return {
      verified_at: new Date().toISOString(),
      observed_status: "STILL_PENDING",
      remediation_effective: false,
      details: `Verification incomplete: Bank=${bank_status}, Webhook=${webhook_status}, Destination=${destination_status}.`,
    };
  },
};
