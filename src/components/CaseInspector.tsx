"use client";

import React from "react";
import { RefundCase } from "@/types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Code,
  CornerDownRight,
  Database,
  ExternalLink,
  HelpCircle,
  Lock,
  Play,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

interface CaseInspectorProps {
  refundCase?: RefundCase;
  onClose: () => void;
  onRunThisCase: (caseId: string) => void;
  isProcessing: boolean;
}

export const CaseInspector: React.FC<CaseInspectorProps> = ({
  refundCase,
  onClose,
  onRunThisCase,
  isProcessing,
}) => {
  if (!refundCase) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-500">
        <Server className="w-8 h-8 mb-2 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-300">No Case Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select any refund row in the Live Queue to inspect evidence, LLM reasoning, agentic policy rules, and verification outcome.
        </p>
      </div>
    );
  }

  const { evidence, latest_diagnosis, latest_policy, latest_action, latest_verification } = refundCase;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
            {refundCase.case_id}
            {refundCase.is_planted_failure && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-sans font-semibold">
                PLANTED FAILURE CASE
              </span>
            )}
          </div>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-xs text-slate-400 font-mono">{refundCase.refund_id}</span>
        </div>
        <div className="flex items-center gap-2">
          {refundCase.current_status === "LIMBO" && (
            <button
              onClick={() => onRunThisCase(refundCase.case_id)}
              disabled={isProcessing}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              Unstick Now
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Core Case Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Amount</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              ₹{refundCase.amount.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Age in Limbo</div>
            <div className="text-sm font-bold text-slate-300 mt-0.5">
              {refundCase.age_days} days
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Merchant</div>
            <div className="text-xs text-slate-200 font-sans font-medium mt-0.5 truncate">
              {refundCase.merchant_name}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Customer VPA</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {refundCase.customer_vpa_or_account}
            </div>
          </div>
        </div>

        {/* 1. Evidence Telemetry (5 Subsystems) */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              1. Multi-System Telemetry Evidence
            </h4>
            {evidence.has_conflicting_signals && (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Conflicting Signals
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Payment Gateway</span>
              <span className="font-semibold text-slate-200">{evidence.gateway_status}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Acquiring Bank / NPCI</span>
              <span className={`font-semibold ${evidence.bank_status === "CREDIT_CONFIRMED" ? "text-emerald-400" : "text-amber-400"}`}>
                {evidence.bank_status}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Webhook Delivery</span>
              <span className={`font-semibold ${evidence.webhook_status === "DELIVERED" ? "text-emerald-400" : "text-rose-400"}`}>
                {evidence.webhook_status}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Beneficiary Destination</span>
              <span className={`font-semibold ${evidence.destination_status === "VALID_ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>
                {evidence.destination_status}
              </span>
            </div>
          </div>

          {evidence.conflict_summary && (
            <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/40">
              {evidence.conflict_summary}
            </div>
          )}
        </div>

        {/* 2. AI Diagnosis */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              2. AI Diagnosis (Structured JSON)
            </h4>
            {latest_diagnosis && (
              <span className="text-[10px] text-slate-400 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">
                Model: {latest_diagnosis.provider}
              </span>
            )}
          </div>

          {latest_diagnosis ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Likely Stage: </span>
                  <span className="font-bold text-slate-100 uppercase font-mono">
                    {latest_diagnosis.likely_stage}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Confidence: </span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded border ${
                      latest_diagnosis.confidence !== null && latest_diagnosis.confidence >= 0.85
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    {latest_diagnosis.confidence !== null && typeof latest_diagnosis.confidence === "number"
                      ? `${(latest_diagnosis.confidence * 100).toFixed(0)}%`
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 font-medium">Reasoning: </span>
                {latest_diagnosis.reasoning}
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Recommended Action: <span className="text-blue-400 font-semibold">{latest_diagnosis.recommended_action}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic">Not yet analyzed by Diagnosis Agent.</div>
          )}
        </div>

        {/* 3. Agentic Policy Gate */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              3. Agentic Policy Gate (10 Rules)
            </h4>
            {latest_policy && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  latest_policy.allowed
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-rose-950 text-rose-300 border-rose-800"
                }`}
              >
                {latest_policy.allowed ? "ACTION ALLOWED" : "ESCALATED TO HUMAN"}
              </span>
            )}
          </div>

          {latest_policy ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  {latest_policy.checks.confidence_passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  )}
                  <span>Confidence &gt;= 85%</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {latest_policy.checks.amount_passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  )}
                  <span>Amount &lt;= ₹50,000</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {latest_policy.checks.remediation_limit_passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  )}
                  <span>Attempts &lt; 1</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {latest_policy.checks.allowed_action_passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  )}
                  <span>Whitelist Verified</span>
                </div>
              </div>

              <div className={`p-2 rounded text-[11px] font-mono border ${
                latest_policy.allowed
                  ? "bg-emerald-950/20 text-emerald-300 border-emerald-800/40"
                  : "bg-rose-950/20 text-rose-300 border-rose-800/40"
              }`}>
                <span className="font-bold">Rule: </span>{latest_policy.rule_triggered}
                <div className="mt-1 text-[10px] text-slate-300 font-sans">{latest_policy.reason}</div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic">Policy gate pending analysis.</div>
          )}
        </div>

        {/* 4. Action Execution & Outcome Verification */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            4. Mock Action & Outcome Verification
          </h4>

          {latest_action ? (
            <div className="space-y-2">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Tool: {latest_action.tool_name}()</span>
                  <span>{latest_action.success ? "EXEC_OK" : "EXEC_ERR"}</span>
                </div>
                <div className="text-slate-200">{latest_action.output}</div>
              </div>

              {latest_verification ? (
                <div
                  className={`p-2.5 rounded border text-[11px] font-mono flex flex-col gap-1 ${
                    latest_verification.remediation_effective
                      ? "bg-emerald-950/30 text-emerald-300 border-emerald-800/50"
                      : "bg-rose-950/30 text-rose-300 border-rose-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Outcome: {latest_verification.observed_status}</span>
                    <span>
                      {latest_verification.remediation_effective ? "LOOP CLOSED" : "REMEDIATION FAILED"}
                    </span>
                  </div>
                  <div className="text-[10px] font-sans text-slate-300">
                    {latest_verification.details}
                  </div>
                  {!latest_verification.remediation_effective && (
                    <div className="mt-1 pt-1 border-t border-rose-800/40 text-[10px] text-rose-200 font-sans">
                      ⚠ Agent refused to retry blindly. Safely escalated to Human Ops queue with full audit trail.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic text-[11px]">Verification pending...</div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic">No remediation action executed yet.</div>
          )}
        </div>

        {/* 5. Chronological Event Trail */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            5. Complete Event Trail ({evidence.event_trail.length} events)
          </h4>
          <div className="space-y-2 font-mono text-[10px]">
            {evidence.event_trail.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="p-2 rounded bg-slate-900/70 border border-slate-800/60 text-slate-300 flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-200">{evt.event_type}</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-400">
                  System: <span className="text-blue-400">{evt.system}</span> | Status:{" "}
                  <span
                    className={
                      evt.status === "SUCCESS"
                        ? "text-emerald-400"
                        : evt.status === "FAILED"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }
                  >
                    {evt.status}
                  </span>
                </div>
                <div className="text-slate-300 font-sans text-[11px] mt-0.5">{evt.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
