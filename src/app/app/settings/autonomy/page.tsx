"use client";

import React, { useEffect, useState } from "react";
import { Sliders, Shield, Save, CheckCircle2 } from "lucide-react";
import { AutonomyMode, AllowedAction } from "@/types";

export default function AutonomySettingsPage() {
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("APPROVAL_REQUIRED");
  const [confidenceCutoff, setConfidenceCutoff] = useState(85);
  const [highValueLimit, setHighValueLimit] = useState(50000);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowedActions, setAllowedActions] = useState<AllowedAction[]>([
    "resend_webhook",
    "retrigger_bank_leg",
    "correct_destination",
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
          setAllowedActions(res.data.allowed_actions);
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Autonomy & Policy Limits</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Define the precise operational boundaries where the agent may un-stick refunds automatically.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Autonomy Level */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white">Operational Autonomy Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { id: "OBSERVE", title: "Observe Only", desc: "Agent investigates but never executes actions." },
              { id: "APPROVAL_REQUIRED", title: "Approval Required", desc: "Agent recommends action, awaits human authorization." },
              { id: "AUTONOMOUS", title: "Autonomous", desc: "Agent executes permitted actions within policy boundaries." },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setAutonomyMode(m.id as AutonomyMode)}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  autonomyMode === m.id
                    ? "border-blue-500 bg-blue-950/20 text-white font-bold"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span>{m.title}</span>
                  {autonomyMode === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div className="text-[11px] text-slate-400 font-normal leading-relaxed">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Autonomous Confidence Gate (Rule 1)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diagnoses below this certainty threshold are blocked and routed to Human Ops review.
              </p>
            </div>
            <span className="font-mono font-bold text-base text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              {confidenceCutoff}%
            </span>
          </div>

          <input
            type="range"
            min="65"
            max="95"
            value={confidenceCutoff}
            onChange={(e) => setConfidenceCutoff(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        {/* High Value Limit */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">High-Value Threshold (Rule 2)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Refunds exceeding this amount mandate dual-signoff human authorization.
              </p>
            </div>
            <span className="font-mono font-bold text-sm text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
              ₹{highValueLimit.toLocaleString("en-IN")}
            </span>
          </div>

          <select
            value={highValueLimit}
            onChange={(e) => setHighValueLimit(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          >
            <option value="25000">₹25,000 (Conservative)</option>
            <option value="50000">₹50,000 (Standard Production Limit)</option>
            <option value="100000">₹1,00,000 (High Volume Enterprise)</option>
          </select>
        </div>

        {/* Action Whitelist */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white">Authorized Autonomous Actions Whitelist</h3>
          <p className="text-xs text-slate-400">
            Only explicitly whitelisted tools may be invoked by the agent without prior human signoff.
          </p>

          <div className="space-y-2 text-xs font-mono">
            {[
              { id: "resend_webhook", label: "resend_webhook()", desc: "Re-dispatches signed HMAC webhook payload to merchant endpoint." },
              { id: "retrigger_bank_leg", label: "retrigger_bank_leg()", desc: "Issues reversal retry instruction to acquiring bank switch." },
              { id: "correct_destination", label: "correct_destination()", desc: "Re-routes to verified secondary customer account/VPA." },
            ].map((a) => (
              <label
                key={a.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition"
              >
                <input
                  type="checkbox"
                  checked={allowedActions.includes(a.id as AllowedAction)}
                  onChange={() => toggleAction(a.id as AllowedAction)}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-200">{a.label}</div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">{a.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Saved Changes" : "Save Autonomy Policy"}</span>
        </button>
      </form>
    </div>
  );
}
