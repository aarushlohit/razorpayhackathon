"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Shield, Layers, Zap } from "lucide-react";
import { AutonomyMode } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("Acme Commerce");
  const [provider, setProvider] = useState("sandbox");
  const [volume, setVolume] = useState("100-500");
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("APPROVAL_REQUIRED");
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          provider,
          volume,
          autonomy_mode: autonomyMode,
        }),
      });
      router.push("/app");
    } catch (e) {
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto">
        <div className="text-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-white shadow-md shadow-blue-500/20 mx-auto mb-3">
            RL
          </div>
          <h2 className="text-2xl font-bold text-white">Configure Refund Loop</h2>
          <p className="text-xs text-slate-400 mt-1">
            Step {step} of 4: Setup your recovery environment
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-200">Company & Workspace</h3>
              <p className="text-slate-400">Confirm the brand or merchant name for your recovery operations.</p>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Company / Legal Entity</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 mt-4"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-200">Primary Payment Environment</h3>
              <p className="text-slate-400">Select where the agent will listen for refund telemetry events.</p>
              <div className="space-y-2">
                <div
                  onClick={() => setProvider("sandbox")}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    provider === "sandbox"
                      ? "border-blue-500 bg-blue-950/20 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Developer Sandbox (Simulated)</span>
                    {provider === "sandbox" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Operate in a high-fidelity simulated environment with 300 synthetic refund cases.
                  </div>
                </div>

                <div
                  onClick={() => setProvider("razorpay_test")}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    provider === "razorpay_test"
                      ? "border-blue-500 bg-blue-950/20 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Razorpay Test Mode</span>
                    {provider === "razorpay_test" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Connect server-side credentials for Razorpay sandbox payment reversals.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-200">Monthly Refund Operations Volume</h3>
              <p className="text-slate-400">Helps calibrate the rate-limiting and audit batch sizes.</p>
              <div className="grid grid-cols-2 gap-2 font-mono">
                {["< 100", "100 - 500", "500 - 2,500", "2,500+"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVolume(v)}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      volume === v
                        ? "border-blue-500 bg-blue-950/20 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {v} refunds/mo
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-200">Initial Autonomy Level</h3>
              <p className="text-slate-400">Configure how much operational discretion the agent is granted.</p>

              <div className="space-y-2">
                {[
                  {
                    id: "OBSERVE",
                    title: "Observe Only",
                    desc: "Agent investigates and diagnoses, but never executes actions.",
                  },
                  {
                    id: "APPROVAL_REQUIRED",
                    title: "Approval Required (Recommended Default)",
                    desc: "Agent diagnoses and formulates action plans, awaiting human dual-signoff.",
                  },
                  {
                    id: "AUTONOMOUS",
                    title: "Autonomous",
                    desc: "Agent automatically executes permitted actions within strict policy limits.",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setAutonomyMode(item.id as AutonomyMode)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      autonomyMode === item.id
                        ? "border-blue-500 bg-blue-950/20 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{item.title}</span>
                      {autonomyMode === item.id && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Finishing..." : "Enter Workspace Console"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
