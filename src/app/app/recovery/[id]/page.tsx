"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  Play,
  Database,
  ExternalLink,
  Lock,
  Layers,
  HelpCircle,
  ShieldAlert,
  Server,
} from "lucide-react";
import { RefundCase, AuditLogEntry } from "@/types";

export default function CaseInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [refundCase, setRefundCase] = useState<RefundCase | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

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

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/agent/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      await res.json();
      await fetchCaseDetail();
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-mono text-xs">Loading case investigation telemetry...</div>;
  }

  if (!refundCase) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="text-white font-bold">Case not found</div>
        <Link href="/app/recovery" className="text-xs text-blue-400 hover:underline">
          Return to recovery queue
        </Link>
      </div>
    );
  }

  const { evidence, latest_diagnosis, latest_policy, latest_action, latest_verification } = refundCase;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/app/recovery"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Recovery Queue
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 font-mono">
              <h1 className="text-xl font-extrabold text-white">{refundCase.case_id}</h1>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{refundCase.refund_id}</span>
              {refundCase.is_planted_failure && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                  PLANTED FAILURE TEST CASE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Merchant: <strong className="text-slate-200">{refundCase.merchant_name}</strong> • Customer: <strong className="text-slate-200">{refundCase.customer_name}</strong> ({refundCase.customer_vpa_or_account})
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-2xl font-black text-white">₹{refundCase.amount.toLocaleString("en-IN")}</div>
              <div className="text-[10px] text-slate-400">{refundCase.age_days} days in limbo</div>
            </div>

            {refundCase.current_status === "LIMBO" && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{executing ? "Investigating..." : "Unstick Refund"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: What Happened & 5 Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 1. What Happened / Event Timeline (6 cols) */}
        <div className="md:col-span-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              1. What Happened? (Event Trail)
            </div>

            <div className="space-y-3 font-mono text-xs">
              {evidence.event_trail.map((evt, i) => (
                <div key={evt.id || i} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span className="font-bold text-slate-200">{evt.event_type}</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    System: <span className="text-blue-400 font-semibold">{evt.system}</span> | Status:{" "}
                    <span className={evt.status === "SUCCESS" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {evt.status}
                    </span>
                  </div>
                  <div className="text-slate-300 font-sans text-xs mt-1 leading-relaxed">
                    {evt.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Telemetry Evidence (6 cols) */}
        <div className="md:col-span-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                2. Multi-System Telemetry
              </div>
              {evidence.has_conflicting_signals && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Contradictory Evidence
                </span>
              )}
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Payment Gateway</span>
                <span className="font-bold text-slate-200">{evidence.gateway_status}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Acquiring Bank Switch</span>
                <span className={`font-bold ${evidence.bank_status === "CREDIT_CONFIRMED" ? "text-emerald-400" : "text-amber-400"}`}>
                  {evidence.bank_status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Webhook Dispatcher</span>
                <span className={`font-bold ${evidence.webhook_status === "DELIVERED" ? "text-emerald-400" : "text-rose-400"}`}>
                  {evidence.webhook_status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Beneficiary Destination</span>
                <span className={`font-bold ${evidence.destination_status === "VALID_ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>
                  {evidence.destination_status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Accounting Ledger</span>
                <span className="font-bold text-slate-200">{evidence.ledger_status}</span>
              </div>
            </div>

            {evidence.conflict_summary && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                {evidence.conflict_summary}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Agent Decision & Policy Gate */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Agent Decision (7 cols) */}
        <div className="md:col-span-7 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              3. AI Diagnosis
            </div>
            {latest_diagnosis && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Model: {latest_diagnosis.provider}
              </span>
            )}
          </div>

          {latest_diagnosis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Likely Failure Point: </span>
                  <span className="font-bold text-white uppercase font-mono">
                    {latest_diagnosis.likely_stage}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Confidence:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
                      latest_diagnosis.confidence >= 0.85
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    {(latest_diagnosis.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                <span className="font-semibold text-slate-400 block mb-1">Reasoning:</span>
                {latest_diagnosis.reasoning}
              </div>

              <div className="text-xs font-mono text-slate-400">
                Recommended Action: <strong className="text-blue-400">{latest_diagnosis.recommended_action}()</strong>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Not analyzed yet. Click &ldquo;Unstick Refund&rdquo; to execute investigation.
            </div>
          )}
        </div>

        {/* Policy Gate (5 cols) */}
        <div className="md:col-span-5 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              4. Deterministic Policy Gate
            </div>
            {latest_policy && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  latest_policy.allowed
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-rose-950 text-rose-300 border-rose-800"
                }`}
              >
                {latest_policy.allowed ? "ALLOWED" : "ESCALATED"}
              </span>
            )}
          </div>

          {latest_policy ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span>Confidence &gt;= 85%</span>
                {latest_policy.checks.confidence_passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span>Amount &lt;= ₹50,000</span>
                {latest_policy.checks.amount_passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span>Previous Attempts &lt; 1</span>
                {latest_policy.checks.remediation_limit_passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span>Action Whitelist Valid</span>
                {latest_policy.checks.allowed_action_passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>

              <div className="mt-2 text-[10px] text-slate-400 font-sans">
                {latest_policy.reason}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Policy evaluation pending.
            </div>
          )}
        </div>
      </div>

      {/* 4. Action Execution & Outcome Verification */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          5. Bounded Action & Outcome Verification (Closed-Loop)
        </div>

        {latest_action ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Tool Result */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Tool: {latest_action.tool_name}()</span>
                <span className="text-blue-400 font-bold">{latest_action.provider_environment}</span>
              </div>
              <div className="text-slate-200">{latest_action.output}</div>
              <div className="text-[10px] text-slate-500">Executed at: {new Date(latest_action.executed_at).toLocaleTimeString()}</div>
            </div>

            {/* Verification Result */}
            {latest_verification ? (
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  latest_verification.remediation_effective
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                    : "bg-rose-950/20 border-rose-800/40 text-rose-300"
                }`}
              >
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>Outcome: {latest_verification.observed_status}</span>
                    <span>{latest_verification.remediation_effective ? "RESOLVED ✓" : "REMEDIATION FAILED ✗"}</span>
                  </div>
                  <div className="text-slate-300 font-sans text-xs">{latest_verification.details}</div>
                </div>

                {!latest_verification.remediation_effective && (
                  <div className="mt-3 pt-2 border-t border-rose-800/40 text-[11px] text-rose-200 font-sans">
                    ⚠ Agent observed database state unchanged. Refused to retry infinitely. Safely escalated to Human Ops.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-500">
                Outcome verification pending...
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            No remediation executed yet.
          </div>
        )}
      </div>
    </div>
  );
}
