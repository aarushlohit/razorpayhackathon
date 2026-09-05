import type { RefundCase, FailureClass, EventTrailItem, EvidencePackage, SimulatorConfig } from "../../types/index";

// Fast, seedable PRNG (Mulberry32)
export function createPRNG(seed: number) {
  let s = Math.floor(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS = [
  { id: "mer_swiggy_01", name: "Swiggy QuickMart" },
  { id: "mer_zomato_02", name: "Zomato Gold Delivery" },
  { id: "mer_zepto_03", name: "Zepto Express Grocery" },
  { id: "mer_cultfit_04", name: "Cult.fit Wellness" },
  { id: "mer_bookmyshow_05", name: "BookMyShow Events" },
  { id: "mer_nykaa_06", name: "Nykaa Beauty & Luxe" },
  { id: "mer_lenskart_07", name: "Lenskart Eyewear" },
  { id: "mer_tatacliq_08", name: "Tata CLiQ Luxury" },
  { id: "mer_blinkit_09", name: "Blinkit Fast Commerce" },
  { id: "mer_makemytrip_10", name: "MakeMyTrip Air Travel" },
  { id: "mer_cleartrip_11", name: "Cleartrip Stays" },
  { id: "mer_urbancompany_12", name: "Urban Company Home" },
];

const CUSTOMER_NAMES = [
  "Aarav Sharma", "Diya Patel", "Rohan Iyer", "Ananya Deshmukh",
  "Aditya Verma", "Kavya Menon", "Siddharth Rao", "Pooja Hegde",
  "Vikram Malhotra", "Meera Sen", "Kabir Chawla", "Neha Kulkarni",
  "Arjun Nair", "Tanvi Bhatia", "Rahul Kapoor", "Ishita Roy"
];

export function generateRefundDataset(config: SimulatorConfig): RefundCase[] {
  const prng = createPRNG(config.seed);
  const cases: RefundCase[] = [];
  const count = config.count || 300;

  // Decide planted failure index (guarantee 1 planted failure case per batch)
  const plantedFailureIdx = Math.floor(prng() * Math.min(count, 40)) + 5; // ensure it's in top 40 for easy demo viewing

  for (let i = 0; i < count; i++) {
    const isPlanted = i === plantedFailureIdx;
    const roll = prng();
    
    // Distribution:
    // Easy mode has fewer ambiguous cases, Ambiguous mode has more ambiguous cases
    let failureClass: FailureClass;
    if (config.difficulty === "easy") {
      if (roll < 0.45) failureClass = "WEBHOOK_MISSING";
      else if (roll < 0.75) failureClass = "BANK_LEG_STUCK";
      else if (roll < 0.95) failureClass = "INVALID_DESTINATION";
      else failureClass = "LEDGER_MISMATCH";
    } else if (config.difficulty === "ambiguous") {
      if (roll < 0.30) failureClass = "WEBHOOK_MISSING";
      else if (roll < 0.50) failureClass = "BANK_LEG_STUCK";
      else if (roll < 0.65) failureClass = "INVALID_DESTINATION";
      else if (roll < 0.75) failureClass = "LEDGER_MISMATCH";
      else failureClass = "AMBIGUOUS";
    } else {
      // Normal
      if (roll < 0.40) failureClass = "WEBHOOK_MISSING";
      else if (roll < 0.65) failureClass = "BANK_LEG_STUCK";
      else if (roll < 0.85) failureClass = "INVALID_DESTINATION";
      else if (roll < 0.95) failureClass = "LEDGER_MISMATCH";
      else failureClass = "AMBIGUOUS";
    }

    if (isPlanted) {
      failureClass = "BANK_LEG_STUCK"; // Planted failure simulates bank rejection on retry
    }

    const merchant = MERCHANTS[Math.floor(prng() * MERCHANTS.length)];
    const customer = CUSTOMER_NAMES[Math.floor(prng() * CUSTOMER_NAMES.length)];
    const customerVpa = `${customer.toLowerCase().replace(/\s+/g, ".")}${Math.floor(prng() * 90 + 10)}@okhdfcbank`;
    
    // Amounts: 85% normal (₹350 - ₹18,000), 15% high-value (₹52,000 - ₹95,000) to test safety policy rule
    let amount: number;
    if (prng() < 0.12 && !isPlanted && failureClass !== "AMBIGUOUS") {
      // High value to test high-value policy gate
      amount = Math.floor(prng() * 45000 + 52000);
    } else {
      amount = Math.floor(prng() * 12500 + 350);
    }

    const ageDays = Math.floor(prng() * 12 + 1);
    const caseId = `CS_${(config.seed % 1000).toString().padStart(3, "0")}_${(i + 1).toString().padStart(4, "0")}`;
    const refundId = `rfnd_${Math.floor(prng() * 899999 + 100000)}`;

    const evidence = buildEvidenceForCase(caseId, failureClass, isPlanted, ageDays, amount, prng, config.difficulty);

    cases.push({
      case_id: caseId,
      refund_id: refundId,
      amount,
      currency: "INR",
      created_at: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString(),
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      customer_id: `cust_${Math.floor(prng() * 89999 + 10000)}`,
      customer_name: customer,
      customer_vpa_or_account: customerVpa,
      current_status: "LIMBO",
      failure_class: failureClass,
      is_planted_failure: isPlanted,
      remediation_attempts: 0,
      age_days: ageDays,
      evidence,
    });
  }

  return cases;
}

function buildEvidenceForCase(
  caseId: string,
  failureClass: FailureClass,
  isPlanted: boolean,
  ageDays: number,
  amount: number,
  prng: () => number,
  difficulty: "easy" | "normal" | "ambiguous"
): EvidencePackage {
  const baseTime = Date.now() - ageDays * 24 * 60 * 60 * 1000;
  const trail: EventTrailItem[] = [
    {
      id: `evt_init_${caseId}`,
      timestamp: new Date(baseTime).toISOString(),
      event_type: "refund_initiated",
      system: "GATEWAY",
      status: "SUCCESS",
      details: `Merchant initiated refund for ₹${amount.toLocaleString("en-IN")}`
    },
    {
      id: `evt_gw_${caseId}`,
      timestamp: new Date(baseTime + 1500).toISOString(),
      event_type: "gateway_acknowledged",
      system: "GATEWAY",
      status: "SUCCESS",
      details: "Gateway verified transaction origin and debit balance"
    }
  ];

  let gateway_status: EvidencePackage["gateway_status"] = "ACKNOWLEDGED";
  let bank_status: EvidencePackage["bank_status"] = "CREDIT_CONFIRMED";
  let webhook_status: EvidencePackage["webhook_status"] = "DELIVERED";
  let destination_status: EvidencePackage["destination_status"] = "VALID_ACTIVE";
  let ledger_status: EvidencePackage["ledger_status"] = "REFUNDED";
  let hasConflictingSignals = false;
  let conflictSummary: string | undefined = undefined;

  switch (failureClass) {
    case "WEBHOOK_MISSING": {
      bank_status = "CREDIT_CONFIRMED";
      destination_status = "VALID_ACTIVE";
      ledger_status = "REFUNDED";
      webhook_status = prng() > 0.5 ? "FAILED_TIMEOUT" : "500_SERVER_ERROR";
      
      trail.push({
        id: `evt_bank_${caseId}`,
        timestamp: new Date(baseTime + 45000).toISOString(),
        event_type: "bank_credit_confirmed",
        system: "NPCI_BANK",
        status: "SUCCESS",
        details: "Acquiring switch processed reversal to customer account"
      });
      trail.push({
        id: `evt_wh_${caseId}`,
        timestamp: new Date(baseTime + 48000).toISOString(),
        event_type: "webhook_delivery_attempt",
        system: "WEBHOOK_DISPATCHER",
        status: "FAILED",
        details: webhook_status === "FAILED_TIMEOUT" 
          ? "HTTP POST to merchant webhook endpoint timed out after 10000ms" 
          : "Merchant server returned HTTP 500 Internal Server Error"
      });
      break;
    }

    case "BANK_LEG_STUCK": {
      destination_status = "VALID_ACTIVE";
      ledger_status = "REFUNDED";
      webhook_status = "NOT_DISPATCHED";
      bank_status = isPlanted ? "NO_UPDATE" : "PENDING_SWITCH";

      trail.push({
        id: `evt_bank_stuck_${caseId}`,
        timestamp: new Date(baseTime + 30000).toISOString(),
        event_type: "bank_switch_dispatched",
        system: "NPCI_BANK",
        status: "PENDING",
        details: isPlanted
          ? "Batch file sent to beneficiary bank, no settlement ACK received after 72 hours"
          : "NPCI switch acknowledged dispatch but no final RRN confirmation callback returned"
      });
      break;
    }

    case "INVALID_DESTINATION": {
      const destType = prng() > 0.5 ? "VPA_DECOMMISSIONED" : "BENEFICIARY_BLOCKED";
      destination_status = destType;
      bank_status = "REJECTED";
      ledger_status = "MISMATCH_PENDING";
      webhook_status = "NOT_DISPATCHED";

      trail.push({
        id: `evt_dest_${caseId}`,
        timestamp: new Date(baseTime + 20000).toISOString(),
        event_type: "destination_validation_failed",
        system: "BENEFICIARY_VALIDATOR",
        status: "FAILED",
        details: destType === "VPA_DECOMMISSIONED"
          ? "Customer UPI handle reported as inactive or deregistered by PSP"
          : "Beneficiary bank account reported frozen / NRE restriction"
      });
      break;
    }

    case "LEDGER_MISMATCH": {
      bank_status = "CREDIT_CONFIRMED";
      destination_status = "VALID_ACTIVE";
      ledger_status = "MISMATCH_PENDING";
      webhook_status = "DELIVERED";

      trail.push({
        id: `evt_bank_${caseId}`,
        timestamp: new Date(baseTime + 60000).toISOString(),
        event_type: "bank_credit_confirmed",
        system: "NPCI_BANK",
        status: "SUCCESS",
        details: "Bank settlement cleared successfully"
      });
      trail.push({
        id: `evt_ledger_${caseId}`,
        timestamp: new Date(baseTime + 62000).toISOString(),
        event_type: "ledger_reconciliation_flag",
        system: "MERCHANT_LEDGER",
        status: "PENDING",
        details: "Internal settlement balance not debited due to race condition in accounting worker"
      });
      break;
    }

    case "AMBIGUOUS": {
      // Intentional contradictory signals to force low confidence & safety escalation
      hasConflictingSignals = true;
      gateway_status = "ACKNOWLEDGED";
      bank_status = "NO_UPDATE";
      destination_status = "VALID_ACTIVE";
      webhook_status = "FAILED_TIMEOUT";
      ledger_status = "SETTLEMENT_HOLD";
      conflictSummary = "Conflicting signals: Gateway reports success, but bank switch has no update, webhook failed, and merchant settlement ledger is placed on hold.";

      trail.push({
        id: `evt_amb_bank_${caseId}`,
        timestamp: new Date(baseTime + 25000).toISOString(),
        event_type: "bank_switch_silent_timeout",
        system: "NPCI_BANK",
        status: "TIMEOUT",
        details: "No response from issuing bank gateway"
      });
      trail.push({
        id: `evt_amb_hold_${caseId}`,
        timestamp: new Date(baseTime + 35000).toISOString(),
        event_type: "risk_ops_hold",
        system: "MERCHANT_LEDGER",
        status: "FAILED",
        details: "Risk monitor flagged possible duplicate reversal; settlement ledger frozen"
      });
      trail.push({
        id: `evt_amb_wh_${caseId}`,
        timestamp: new Date(baseTime + 45000).toISOString(),
        event_type: "webhook_delivery_attempt",
        system: "WEBHOOK_DISPATCHER",
        status: "FAILED",
        details: "Webhook timeout after repeated retry failures"
      });
      break;
    }
  }

  // If difficulty is ambiguous, randomly inject contradictory noise into 20% of other cases
  if (difficulty === "ambiguous" && failureClass !== "AMBIGUOUS" && prng() < 0.25) {
    hasConflictingSignals = true;
    conflictSummary = "Intermittent telemetry discrepancy between acquiring switch timestamp and webhook retry counter.";
  }

  return {
    case_id: caseId,
    gateway_status,
    bank_status,
    webhook_status,
    destination_status,
    ledger_status,
    event_trail: trail,
    age_days: ageDays,
    amount,
    currency: "INR",
    has_conflicting_signals: hasConflictingSignals,
    conflict_summary: conflictSummary,
  };
}
