"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AutonomyMode, AllowedAction } from "@/types";

export default function AutonomySettingsPage() {
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("APPROVAL_REQUIRED");
  const [confidenceCutoff, setConfidenceCutoff] = useState(85);
  const [highValueLimit, setHighValueLimit] = useState(50000);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowedActions, setAllowedActions] = useState<AllowedAction[]>([
    "resend_webhook",
    "reconcile_state",
    "refresh_status",
    "verify_refund",
  ]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/autonomy")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setAutonomyMode(res.data.autonomy_mode);
          setConfidenceCutoff(Math.round(res.data.confidence_threshold * 100));
          setHighValueLimit(res.data.high_value_limit);
          setMaxAttempts(res.data.max_attempts);
          if (Array.isArray(res.data.allowed_actions)) {
            setAllowedActions(res.data.allowed_actions);
          }
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/settings/autonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autonomy_mode: autonomyMode,
        confidence_threshold: confidenceCutoff / 100,
        high_value_limit: highValueLimit,
        max_attempts: maxAttempts,
        allowed_actions: allowedActions,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAction = (act: AllowedAction) => {
    if (allowedActions.includes(act)) {
      setAllowedActions(allowedActions.filter((a) => a !== act));
    } else {
      setAllowedActions([...allowedActions, act]);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Autonomy & Governance</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Define agentic safety boundaries, confidence cutoffs, and permitted bounded actions.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Autonomy Level */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E5E7] shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-[#000000]">Operational Autonomy Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { id: "OBSERVE_ONLY", title: "Observe Only", desc: "Agent investigates and diagnoses without mutating state." },
              { id: "APPROVAL_REQUIRED", title: "Approval Required", desc: "Agent formulates remediation plan, awaits human sign-off." },
              { id: "AUTONOMOUS", title: "Autonomous", desc: "Agent executes whitelisted actions within strict policy limits." },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setAutonomyMode(m.id as AutonomyMode)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  autonomyMode === m.id
                    ? "border-[#000000] bg-[#F5F5F7] text-[#000000] font-semibold"
                    : "border-[#E5E5E7] bg-white text-[#6E6E73] hover:border-[#D1D1D6]"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span>{m.title}</span>
                  {autonomyMode === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#000000]" />}
                </div>
                <div className="text-[11px] text-[#6E6E73] font-normal leading-relaxed">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E5E7] shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-[#000000]">AI Confidence Cutoff</h3>
              <p className="text-xs text-[#6E6E73]">Diagnoses below this score trigger immediate human escalation (Rule 1).</p>
            </div>
            <span className="font-mono font-bold text-lg text-[#000000]">{confidenceCutoff}%</span>
          </div>

          <input
            type="range"
            min={70}
            max={99}
            value={confidenceCutoff}
            onChange={(e) => setConfidenceCutoff(Number(e.target.value))}
            className="w-full accent-[#000000]"
          />
        </div>

        {/* High Value Limit */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E5E7] shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-[#000000]">High-Value Escalation Threshold</h3>
              <p className="text-xs text-[#6E6E73]">Refunds exceeding this value require human approval (Rule 2).</p>
            </div>
            <span className="font-mono font-bold text-lg text-[#000000]">₹{highValueLimit.toLocaleString("en-IN")}</span>
          </div>

          <input
            type="number"
            value={highValueLimit}
            onChange={(e) => setHighValueLimit(Number(e.target.value))}
            className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] focus:outline-none focus:border-[#000000] font-mono text-sm"
          />
        </div>

        {/* Authorized Actions Whitelist */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E5E7] shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-[#000000]">Whitelisted Bounded Remediation Tools</h3>
          <p className="text-xs text-[#6E6E73]">Only legitimate, safe payment operations may be executed (Rule 9).</p>

          <div className="space-y-3">
            {[
              { id: "resend_webhook", name: "resend_webhook", desc: "Re-dispatch signed HMAC webhook payload to merchant endpoint." },
              { id: "refresh_status", name: "refresh_status", desc: "Poll acquiring bank switch / gateway status for terminal resolution." },
              { id: "reconcile_state", name: "reconcile_state", desc: "Synchronize internal ledger records with confirmed gateway state." },
              { id: "verify_refund", name: "verify_refund", desc: "Execute multi-subsystem query verification." },
            ].map((action) => (
              <div
                key={action.id}
                onClick={() => toggleAction(action.id as AllowedAction)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  allowedActions.includes(action.id as AllowedAction)
                    ? "border-[#000000] bg-[#F5F5F7]"
                    : "border-[#E5E5E7] bg-white opacity-60 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="font-mono font-semibold text-xs text-[#000000]">{action.name}</div>
                  <div className="text-[11px] text-[#6E6E73]">{action.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowedActions.includes(action.id as AllowedAction)}
                  readOnly
                  className="w-4 h-4 rounded border-[#E5E5E7] text-[#000000] focus:ring-0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-medium text-emerald-700">
              ✓ Autonomy settings persisted to workspace
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-6 py-2.5 bg-[#000000] hover:bg-[#1D1D1F] text-white font-medium text-xs rounded-full transition shadow-sm"
          >
            Save Policy Settings
          </button>
          {saved && (
            <span className="text-xs text-white font-mono">
              ✓ Saved policy boundaries.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
