import type { EvidencePackage, RefundCase } from "../../types/index";

export function collectEvidence(refundCase: RefundCase): EvidencePackage {
  // Pulls evidence from the case record and its event trail
  const evidence = refundCase.evidence;

  // Verify chronology and detect cross-system contradictions
  const isGatewayAcknowledged = evidence.gateway_status === "ACKNOWLEDGED";
  const isBankPendingOrStuck = evidence.bank_status === "PENDING_SWITCH" || evidence.bank_status === "NO_UPDATE";
  const isWebhookFailed = evidence.webhook_status === "FAILED_TIMEOUT" || evidence.webhook_status === "500_SERVER_ERROR";
  const isDestinationInvalid = evidence.destination_status !== "VALID_ACTIVE";
  const isLedgerMismatch = evidence.ledger_status === "MISMATCH_PENDING" || evidence.ledger_status === "SETTLEMENT_HOLD";

  let hasConflicts = evidence.has_conflicting_signals;
  let conflictSummary = evidence.conflict_summary;

  // If gateway acknowledged but both webhook failed AND bank is stuck AND ledger on hold
  if (isGatewayAcknowledged && isWebhookFailed && isBankPendingOrStuck && isLedgerMismatch) {
    hasConflicts = true;
    conflictSummary = "Severe cross-system telemetry conflict: Gateway acknowledged, but bank leg is pending, webhook failed, and ledger holds settlement.";
  }

  return {
    ...evidence,
    has_conflicting_signals: hasConflicts,
    conflict_summary: conflictSummary,
  };
}

export function formatEvidenceForPrompt(evidence: EvidencePackage, refundCase: RefundCase): string {
  return `
REFUND INVESTIGATION CASE: ${refundCase.case_id}
===================================================
Amount: ₹${refundCase.amount.toLocaleString("en-IN")} (${refundCase.currency})
Age: ${refundCase.age_days} days in limbo
Merchant: ${refundCase.merchant_name} (${refundCase.merchant_id})
Customer: ${refundCase.customer_name} (${refundCase.customer_vpa_or_account})

SYSTEM TELEMETRY EVIDENCE:
1. Payment Gateway: ${evidence.gateway_status}
2. Acquiring Bank / NPCI Switch: ${evidence.bank_status}
3. Webhook Delivery: ${evidence.webhook_status}
4. Beneficiary Destination: ${evidence.destination_status}
5. Merchant Accounting Ledger: ${evidence.ledger_status}
6. Cross-System Conflict Detected: ${evidence.has_conflicting_signals ? "YES - " + evidence.conflict_summary : "NO"}

CHRONOLOGICAL EVENT TRAIL:
${evidence.event_trail.map((e, idx) => `  [${idx + 1}] ${e.timestamp} | ${e.system} | ${e.event_type} | ${e.status} -> ${e.details}`).join("\n")}
`;
}
