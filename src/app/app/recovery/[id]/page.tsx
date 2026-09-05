"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, ArrowRight } from "lucide-react";
import { RefundCase, AuditLogEntry } from "@/types";

export default function CaseInvestigationPage() {
  const params = useParams();
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
    return <div className="py-20 text-center text-[#A1A1A6] font-mono text-xs">Loading case investigation telemetry...</div>;
  }

  if (!refundCase) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-white font-bold">Case not found</div>
        <Link href="/app/recovery" className="text-xs text-[#A1A1A6] hover:underline">
          Return to recovery queue
        </Link>
      </div>
    );
  }

  const { evidence, latest_diagnosis, latest_policy, latest_action, latest_verification } = refundCase;

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Header */}
      <div>
        <Link
          href="/app/recovery"
          className="inline-flex items-center gap-1.5 text-xs text-[#6E6E73] hover:text-[#000000] transition mb-4 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Recovery Queue
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E7]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#000000] font-mono">{refundCase.case_id}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-[#E5E5E7] bg-[#F5F5F7] text-[#1D1D1F] font-mono font-medium">
                {refundCase.current_status}
              </span>
            </div>
            <p className="text-xs text-[#6E6E73]">
              {refundCase.merchant_name} • Customer: {refundCase.customer_name} ({refundCase.customer_vpa_or_account}) • Age: {refundCase.age_days}d
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] font-mono uppercase text-[#86868B]">Refund Liability</div>
              <div className="text-2xl font-bold font-mono text-[#000000]">
                ₹{refundCase.amount.toLocaleString("en-IN")}
              </div>
            </div>

            <button
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {executing ? "Executing Closed Loop..." : "Run AI Investigation"}
            </button>
          </div>
        </div>
      </div>

      {/* 7-Stage Visual Lifecycle Stepper */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 shadow-2xs">
        <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider mb-4">
          Autonomous Operations Lifecycle
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div className="space-y-1 border-t-2 border-[#000000] pt-2">
            <div className="font-mono text-[10px] text-[#86868B]">01 DETECT</div>
            <div className="font-semibold text-[#000000]">Identified Stuck</div>
            <div className="text-[11px] text-[#6E6E73]">{refundCase.age_days}d in limbo</div>
          </div>

          <div className={`space-y-1 border-t-2 pt-2 ${refundCase.evidence ? "border-[#000000]" : "border-[#E5E5E7]"}`}>
            <div className="font-mono text-[10px] text-[#86868B]">02 INVESTIGATE</div>
            <div className="font-semibold text-[#000000]">Correlate Telemetry</div>
            <div className="text-[11px] text-[#6E6E73]">5 subsystems polled</div>
          </div>

          <div className={`space-y-1 border-t-2 pt-2 ${latest_diagnosis ? "border-[#000000]" : "border-[#E5E5E7]"}`}>
            <div className="font-mono text-[10px] text-[#86868B]">03 REASON</div>
            <div className="font-semibold text-[#000000]">AI Diagnosis</div>
            <div className="text-[11px] text-[#6E6E73]">
              {latest_diagnosis ? `${(latest_diagnosis.confidence * 100).toFixed(0)}% confidence` : "Pending"}
            </div>
          </div>

          <div className={`space-y-1 border-t-2 pt-2 ${latest_policy ? "border-[#000000]" : "border-[#E5E5E7]"}`}>
            <div className="font-mono text-[10px] text-[#86868B]">04 POLICY</div>
            <div className="font-semibold text-[#000000]">10 Guardrails</div>
            <div className="text-[11px] text-[#6E6E73]">
              {latest_policy ? (latest_policy.allowed ? "Passed" : "Halted") : "Pending"}
            </div>
          </div>

          <div className={`space-y-1 border-t-2 pt-2 ${latest_verification ? "border-[#000000]" : "border-[#E5E5E7]"}`}>
            <div className="font-mono text-[10px] text-[#86868B]">05 VERIFY & CLOSE</div>
            <div className="font-semibold text-[#000000]">Independent Check</div>
            <div className="text-[11px] text-[#6E6E73]">
              {latest_verification ? latest_verification.observed_status : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Subsystem Evidence Grid */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-[#000000] tracking-tight">
          Subsystem Telemetry Correlation
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-1">
          <div className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5E7] space-y-1">
            <div className="text-[11px] text-[#6E6E73]">Payment Gateway</div>
            <div className="text-xs font-mono font-semibold text-[#000000]">{evidence.gateway_status}</div>
          </div>
          <div className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5E7] space-y-1">
            <div className="text-[11px] text-[#6E6E73]">Settlement Leg</div>
            <div className="text-xs font-mono font-semibold text-[#000000]">{evidence.bank_status}</div>
          </div>
          <div className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5E7] space-y-1">
            <div className="text-[11px] text-[#6E6E73]">Webhook Dispatcher</div>
            <div className="text-xs font-mono font-semibold text-[#000000]">{evidence.webhook_status}</div>
          </div>
          <div className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5E7] space-y-1">
            <div className="text-[11px] text-[#6E6E73]">Beneficiary Destination</div>
            <div className="text-xs font-mono font-semibold text-[#000000]">{evidence.destination_status}</div>
          </div>
          <div className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5E7] space-y-1">
            <div className="text-[11px] text-[#6E6E73]">Merchant Ledger</div>
            <div className="text-xs font-mono font-semibold text-[#000000]">{evidence.ledger_status}</div>
          </div>
        </div>
      </div>

      {/* AI Structured Diagnosis */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#000000] tracking-tight">
            AI Diagnosis (Structured JSON)
          </h2>
          {latest_diagnosis && (
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#6E6E73]">
              <span>Provider: <strong className="text-[#000000]">{latest_diagnosis.provider}</strong> ({latest_diagnosis.model || "default"})</span>
              <span>Latency: <strong className="text-[#000000]">{latest_diagnosis.latency_ms ? `${latest_diagnosis.latency_ms}ms` : "—"}</strong></span>
            </div>
          )}
        </div>

        {latest_diagnosis ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-[#E5E5E7]">
                <div className="text-[11px] text-[#6E6E73]">Likely Failure Point</div>
                <div className="font-mono font-semibold text-sm text-[#000000] uppercase mt-0.5">
                  {latest_diagnosis.likely_stage}
                </div>
              </div>

              <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-[#E5E5E7]">
                <div className="text-[11px] text-[#6E6E73]">Confidence Score</div>
                <div className="font-mono font-semibold text-sm text-[#000000] mt-0.5">
                  {(latest_diagnosis.confidence * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-[#E5E5E7]">
                <div className="text-[11px] text-[#6E6E73]">Recommended Action</div>
                <div className="font-mono font-semibold text-sm text-[#000000] mt-0.5">
                  {latest_diagnosis.recommended_action}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl text-xs space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#86868B]">AI Reasoning & Evidence Cited</div>
              <p className="text-[#1D1D1F] leading-relaxed">{latest_diagnosis.reasoning}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#6E6E73] py-4 text-center">
            No diagnosis recorded yet. Click &quot;Run AI Investigation&quot; to execute real Google Gemini inference.
          </div>
        )}
      </div>

      {/* Deterministic Policy Gate & Verification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-[#000000]">Deterministic Policy Gate</h3>
          {latest_policy ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="font-semibold text-[#000000]">{latest_policy.rule_triggered}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${latest_policy.allowed ? "bg-black text-white" : "bg-red-100 text-red-800"}`}>
                  {latest_policy.allowed ? "AUTHORIZED" : "HALTED"}
                </span>
              </div>
              <p className="text-[#6E6E73] leading-relaxed">{latest_policy.reason}</p>
            </div>
          ) : (
            <div className="text-xs text-[#6E6E73]">Policy evaluation pending AI diagnosis.</div>
          )}
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-[#000000]">Execution & Verification</h3>
          {latest_action ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="font-semibold text-[#000000]">Action: {latest_action.tool_name}</span>
                <span className="text-[10px] text-[#86868B]">{latest_action.provider_environment}</span>
              </div>
              <p className="text-[#6E6E73]">{latest_action.output}</p>
              {latest_verification && (
                <div className="pt-2 border-t border-[#E5E5E7] space-y-0.5">
                  <div className="font-semibold font-mono text-[#000000]">
                    Verification: {latest_verification.observed_status}
                  </div>
                  <p className="text-[11px] text-[#6E6E73]">{latest_verification.details}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#6E6E73]">Awaiting policy authorization to execute action.</div>
          )}
        </div>
      </div>
    </div>
  );
}
