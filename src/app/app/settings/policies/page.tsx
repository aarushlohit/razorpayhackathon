"use client";

import React from "react";
import { Shield, CheckCircle2 } from "lucide-react";

export default function PoliciesPage() {
  const rules = [
    { num: 1, name: "Confidence Gate", rule: "Confidence < 0.85", outcome: "Escalate to Human Ops" },
    { num: 2, name: "High-Value Threshold", rule: "Amount > ₹50,000", outcome: "Mandatory Dual Signoff" },
    { num: 3, name: "Remediation Ceiling", rule: "Previous Attempts >= 1", outcome: "No Autonomous Action (Zero Infinite Loops)" },
    { num: 4, name: "Mandatory Audit Logging", rule: "Every sub-second step", outcome: "Immutable Audit Log Record" },
    { num: 5, name: "Mandatory Outcome Verification", rule: "Post-remediation state check", outcome: "Verify real database transition" },
    { num: 6, name: "Ineffective Remediation Stop", rule: "State unchanged after action", outcome: "Halt retries & escalate" },
    { num: 7, name: "No Silent Retries", rule: "Exhausted retry window", outcome: "Immediate Human Escalation" },
    { num: 8, name: "Schema Validation Guard", rule: "Malformed LLM output", outcome: "Auto-Heal -> 1-shot repair -> Escalate" },
    { num: 9, name: "Action Whitelist Check", rule: "Non-whitelisted action", outcome: "Disallow & Escalate" },
    { num: 10, name: "Telemetry Completeness", rule: "Missing critical evidence", outcome: "Disallow & Escalate" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Agentic Safety Policy Rules</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Consequential decisions are governed by code. The LLM has zero bypass authority.
        </p>
      </div>

      <div className="space-y-2 text-xs">
        {rules.map((r) => (
          <div
            key={r.num}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                {r.num}
              </span>
              <div>
                <div className="font-bold text-slate-200">{r.name}</div>
                <div className="text-[11px] text-slate-400 font-sans">{r.rule}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              {r.outcome}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
