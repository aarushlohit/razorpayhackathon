"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, ChevronRight, ChevronDown, Check, X, Shield, ArrowRight } from "lucide-react";
import { RefundCase, AuditLogEntry } from "@/types";

export default function CaseInvestigationPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [refundCase, setRefundCase] = useState<RefundCase | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"auto" | "gemini" | "opencode" | "nvidia">("auto");
  const [showWhyExpanded, setShowWhyExpanded] = useState(false);
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);

  const fetchCaseDetail = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      if (data.success) {
        setRefundCase(data.data.case);
        setAuditTrail(data.data.auditTrail);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
  }, [caseId]);

  const [approving, setApproving] = useState(false);

  const handleApproveAndExecute = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          approve_and_execute: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCaseDetail();
      }
    } finally {
      setApproving(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/agent/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          provider: selectedProvider === "auto" ? undefined : selectedProvider,
        }),
      });
      await res.json();
      await fetchCaseDetail();
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[#86868B] font-mono text-xs">
        Correlating payment telemetry...
      </div>
    );
  }

  if (!refundCase) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-[#000000] font-semibold">Refund case not found</div>
        <Link href="/app/recovery" className="text-xs text-[#6E6E73] hover:underline">
          Return to recovery queue
        </Link>
      </div>
    );
  }

  const { evidence, latest_diagnosis, latest_policy, latest_action, latest_verification } = refundCase;
  const assessment = latest_diagnosis?.assessment;
  const isResolved = refundCase.current_status === "RESOLVED";
  const isBlocked = latest_policy && !latest_policy.allowed;

  return (
    <div className="space-y-10 max-w-4xl pb-20">
      {/* Back Link */}
      <div>
        <Link
          href="/app/recovery"
          className="inline-flex items-center gap-1 text-xs text-[#6E6E73] hover:text-[#000000] transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Recovery queue
        </Link>
      </div>

      {/* ─── 1. Case Header ────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5E7] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#000000] font-mono">
                {refundCase.case_id}
              </h1>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium ${
                isResolved
                  ? "bg-[#EBFDF0] text-[#166534] border border-[#BBF7D0]"
                  : isBlocked
                  ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                  : "bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]"
              }`}>
                {isResolved ? "Verified Resolved" : isBlocked ? "Action Paused · Human Approval Needed" : "Needs Attention"}
              </span>
            </div>
            <div className="text-[14px] text-[#6E6E73]">
              <span className="font-semibold text-[#1D1D1F]">{refundCase.merchant_name}</span>
              {" · "}
              ₹{refundCase.amount.toLocaleString("en-IN")} refund liability
              {" · "}
              {refundCase.age_days} days in limbo
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              disabled={executing || approving}
              className="text-xs bg-[#F5F5F7] border border-[#E5E5E7] rounded-full px-3 py-1.5 text-[#1D1D1F] font-mono font-medium focus:outline-none focus:border-[#000000] cursor-pointer"
            >
              <option value="auto">Auto Agent (Gemini 2.5 → OpenCode Ling 3.0)</option>
              <option value="gemini">Google Gemini 2.5 Flash</option>
              <option value="opencode">OpenCode Zen (ling-3.0-flash)</option>
              <option value="nvidia">NVIDIA NIM (kimi-k3)</option>
            </select>

            <button
              onClick={handleExecute}
              disabled={executing || approving || isResolved}
              className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              {executing ? "Investigating..." : isResolved ? "Resolved" : "Run investigation"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Action Paused / Human Approval Banner (If Blocked) ───────── */}
      {isBlocked && (
        <div className="p-5 rounded-2xl bg-[#FFFBF5] border border-[#FED7AA] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9A3412]">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                AGENTIC SAFETY BOUNDARY TRIGGERED · ACTION PAUSED
              </div>
              <p className="text-[13px] text-[#1D1D1F] leading-relaxed">
                This refund requires cryptographic human operator authorization before downstream agentic remediation can execute.
              </p>
              <div className="text-xs text-[#9A3412] font-mono">
                Policy Reason: {latest_policy.reason}
              </div>
            </div>

            <button
              onClick={handleApproveAndExecute}
              disabled={approving || executing}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-xs shrink-0 self-start sm:self-center"
            >
              {approving ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Authorizing & Executing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Approve & Execute Remediation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. AI Investigation ("Here's what I found") ───────────────── */}
      <div className="space-y-4">
        <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
          AI INVESTIGATION
        </div>

        {latest_diagnosis ? (
          latest_diagnosis.provider === "AI_UNAVAILABLE" ? (
            <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#000000]">
                <span className="w-2 h-2 rounded-full bg-[#86868B]" />
                AI INVESTIGATION UNAVAILABLE
              </div>
              <p className="text-[14px] text-[#1D1D1F] leading-relaxed">
                {latest_diagnosis.reasoning}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#86868B] font-mono pt-1">
                <span>Attempted: Google Gemini (2.5-flash), OpenCode (ling-3.0-flash), NVIDIA NIM</span>
                {latest_diagnosis.latency_ms && (
                  <>
                    <span>·</span>
                    <span>Total elapsed: {latest_diagnosis.latency_ms}ms</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-[#000000]">
                  Here&apos;s what I found.
                </h2>
                <p className="text-[15px] text-[#1D1D1F] leading-relaxed max-w-2xl">
                  {assessment?.summary || latest_diagnosis.reasoning}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6E73] font-mono">
                <span className="font-semibold text-[#000000]">
                  {(latest_diagnosis.confidence * 100).toFixed(0)}% confidence
                </span>
                <span>·</span>
                <span className="capitalize">{latest_diagnosis.provider}</span>
                {latest_diagnosis.model && (
                  <>
                    <span>·</span>
                    <span>{latest_diagnosis.model}</span>
                  </>
                )}
                {latest_diagnosis.latency_ms && (
                  <>
                    <span>·</span>
                    <span>{latest_diagnosis.latency_ms}ms</span>
                  </>
                )}
              </div>

              {/* Observational Uncertainty Statement */}
              {assessment?.uncertainty && (
                <div className="p-4 rounded-xl bg-[#FBFBFC] border border-[#E5E5E7] text-xs space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#86868B] font-semibold">
                    Observational Uncertainty
                  </div>
                  <p className="text-[#6E6E73] leading-relaxed">
                    {assessment.uncertainty}
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="py-8 text-center text-xs text-[#86868B] font-mono">
            No investigation run yet. Click &quot;Run investigation&quot; above to begin.
          </div>
        )}
      </div>

      {/* ─── 4. Subsystem Evidence Trail ─────────────────────────────────── */}
      <div className="space-y-4 pt-6 border-t border-[#E5E5E7]">
        <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
          EVIDENCE
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl space-y-1">
            <div className="text-[11px] text-[#86868B]">Payment</div>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#000000]">
              <Check className="w-3 h-3 text-[#34C759]" />
              <span>{evidence?.gateway_status || "ACKNOWLEDGED"}</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl space-y-1">
            <div className="text-[11px] text-[#86868B]">Settlement</div>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#000000]">
              <Check className="w-3 h-3 text-[#34C759]" />
              <span>{evidence?.bank_status || "CREDIT_CONFIRMED"}</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl space-y-1">
            <div className="text-[11px] text-[#86868B]">Webhook</div>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#000000]">
              {evidence?.webhook_status === "DELIVERED" ? (
                <Check className="w-3 h-3 text-[#34C759]" />
              ) : (
                <X className="w-3 h-3 text-[#FF3B30]" />
              )}
              <span>{evidence?.webhook_status || "PENDING"}</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl space-y-1">
            <div className="text-[11px] text-[#86868B]">Destination</div>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#000000]">
              <Check className="w-3 h-3 text-[#34C759]" />
              <span>{evidence?.destination_status || "ACTIVE"}</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl space-y-1">
            <div className="text-[11px] text-[#86868B]">Merchant ledger</div>
            <div className="flex items-center gap-1 font-mono font-semibold text-[#000000]">
              <Check className="w-3 h-3 text-[#34C759]" />
              <span>{evidence?.ledger_status || "REFUNDED"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. Expandable: Why I Think This ─────────────────────────────── */}
      {latest_diagnosis && (
        <div className="pt-2">
          <button
            onClick={() => setShowWhyExpanded(!showWhyExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-[#000000] hover:underline"
          >
            <span>{showWhyExpanded ? "Hide reasoning breakdown" : "Why I think this"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhyExpanded ? "rotate-180" : ""}`} />
          </button>

          {showWhyExpanded && (
            <div className="mt-4 p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#86868B]">Evidence Correlated</div>
                  <div className="font-semibold text-[#000000]">5 Subsystems Polled</div>
                  <p className="text-[#6E6E73] text-[11px]">Gateway, settlement rail, webhook queue, beneficiary VPA, merchant ledger.</p>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#86868B]">Primary Hypothesis</div>
                  <div className="font-semibold text-[#000000]">
                    {assessment?.primary_hypothesis?.label || latest_diagnosis.likely_stage}
                  </div>
                  <p className="text-[#6E6E73] text-[11px]">
                    Probability estimate: {(latest_diagnosis.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {assessment?.alternative_hypotheses && assessment.alternative_hypotheses.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E5E5E7]">
                  <div className="text-[10px] font-mono uppercase text-[#86868B]">Alternatives Considered & Weighted</div>
                  <div className="space-y-1">
                    {assessment.alternative_hypotheses.map((alt, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#1D1D1F]">{alt.label}</span>
                        <span className="font-mono text-[#86868B]">{(alt.confidence * 100).toFixed(0)}% probability</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 6. Recommendation ─────────────────────────────────────────── */}
      <div className="space-y-4 pt-6 border-t border-[#E5E5E7]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
            RECOMMENDATION
          </div>
          <span className="text-[10px] font-mono text-[#86868B]">
            AI recommendation · Subject to safety policy
          </span>
        </div>

        {latest_diagnosis ? (
          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
            <div className="text-sm font-semibold text-[#000000]">
              {assessment?.recommended_action?.action === "resend_webhook"
                ? "Retry the merchant webhook"
                : assessment?.recommended_action?.action === "refresh_status"
                ? "Refresh downstream gateway settlement status"
                : assessment?.recommended_action?.action === "reconcile_state"
                ? "Reconcile internal accounting ledger"
                : "Escalate for manual human review"}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase text-[#86868B]">Why this action?</div>
              <p className="text-xs text-[#1D1D1F] leading-relaxed">
                {assessment?.recommended_action?.reason || latest_diagnosis.reasoning}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#86868B] font-mono">
            Awaiting investigation to formulate recommended remediation.
          </div>
        )}
      </div>

      {/* ─── 7. Quiet Safety Checks (Expandable) ─────────────────────────── */}
      <div className="space-y-3 pt-6 border-t border-[#E5E5E7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
              EXECUTION SAFETY
            </span>
            <span className="text-xs font-semibold text-[#000000]">
              {latest_policy?.allowed ? "10/10 Checks Passed" : latest_policy ? "Safety Halt Active" : "10 Invariants Active"}
            </span>
          </div>

          <button
            onClick={() => setShowSafetyDetails(!showSafetyDetails)}
            className="text-xs font-medium text-[#6E6E73] hover:text-[#000000] inline-flex items-center gap-1"
          >
            <span>{showSafetyDetails ? "Hide" : "Details"}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showSafetyDetails ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showSafetyDetails && latest_policy?.rules && (
          <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] divide-y divide-[#E5E5E7] text-xs">
            {latest_policy.rules.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <span className="text-[#1D1D1F]">{r.name}</span>
                <span className={`font-mono text-[10px] font-semibold ${r.passed ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                  {r.passed ? "Passed" : "Blocked"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 8. Action & Independent Verification Outcome ───────────────── */}
      {(latest_action || latest_verification) && (
        <div className="space-y-4 pt-6 border-t border-[#E5E5E7]">
          <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
            OUTCOME
          </div>

          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3 text-xs">
            {latest_action && (
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-[#86868B]">Action Executed</div>
                <div className="font-semibold text-[#000000]">{latest_action.tool_name}()</div>
                <p className="text-[#6E6E73]">{latest_action.output}</p>
              </div>
            )}

            {latest_verification && (
              <div className="space-y-1 pt-2 border-t border-[#E5E5E7]">
                <div className="text-[10px] font-mono uppercase text-[#86868B]">Independent Verification</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${latest_verification.remediation_effective ? "bg-[#34C759]" : "bg-[#FF3B30]"}`} />
                  <span className="font-semibold text-[#000000]">
                    {latest_verification.remediation_effective ? "Confirmed Settled" : "Still Pending"}
                  </span>
                </div>
                <p className="text-[#6E6E73]">{latest_verification.details}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 9. Raw Technical Output (Discreet Drawer) ───────────────────── */}
      {latest_diagnosis?.raw_response && (
        <div className="pt-4 border-t border-[#E5E5E7]">
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="text-xs text-[#86868B] hover:text-[#000000] transition"
          >
            {showRawOutput ? "Hide technical output" : "View technical output"}
          </button>

          {showRawOutput && (
            <pre className="mt-3 p-4 bg-[#F5F5F7] rounded-xl text-[11px] font-mono text-[#1D1D1F] overflow-x-auto">
              {latest_diagnosis.raw_response}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
