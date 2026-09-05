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
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col justify-center py-12 px-6 sm:px-12">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between pb-8 border-b border-[#E5E5E7] mb-8">
          <span className="font-semibold text-base tracking-tight text-[#000000]">REFUND LOOP</span>
          <button
            onClick={() => router.push("/app")}
            className="text-[13px] text-[#6E6E73] hover:text-[#000000] font-medium"
          >
            Save & exit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          {/* Left Progress Steps */}
          <div className="md:col-span-4 space-y-6">
            <div className={`flex items-start gap-3.5 ${step === 1 ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${step === 1 ? "bg-[#000000] text-white" : "border border-[#E5E5E7] text-[#1D1D1F]"}`}>
                1
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#000000]">Company details</div>
                <div className="text-[11px] text-[#6E6E73]">Let&apos;s set up your workspace</div>
              </div>
            </div>

            <div className={`flex items-start gap-3.5 ${step === 2 ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${step === 2 ? "bg-[#000000] text-white" : "border border-[#E5E5E7] text-[#1D1D1F]"}`}>
                2
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#000000]">Payment provider</div>
                <div className="text-[11px] text-[#6E6E73]">Connect your systems</div>
              </div>
            </div>

            <div className={`flex items-start gap-3.5 ${step === 3 ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${step === 3 ? "bg-[#000000] text-white" : "border border-[#E5E5E7] text-[#1D1D1F]"}`}>
                3
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#000000]">Volume & use case</div>
                <div className="text-[11px] text-[#6E6E73]">Tell us a bit more</div>
              </div>
            </div>

            <div className={`flex items-start gap-3.5 ${step === 4 ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${step === 4 ? "bg-[#000000] text-white" : "border border-[#E5E5E7] text-[#1D1D1F]"}`}>
                4
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#000000]">Autonomy mode</div>
                <div className="text-[11px] text-[#6E6E73]">Configure safety limits</div>
              </div>
            </div>
          </div>

          {/* Right Form Container */}
          <div className="md:col-span-8 bg-white border border-[#E5E5E7] rounded-2xl p-8 shadow-sm">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">Step 1 of 4</div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#000000] mt-1">Tell us about your organization</h3>
                  <p className="text-[13px] text-[#6E6E73] mt-1">This helps us configure your workspace and security settings.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Company name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] focus:outline-none focus:border-[#000000] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Industry</label>
                      <select className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] focus:outline-none focus:border-[#000000] text-sm">
                        <option>E-commerce & Retail</option>
                        <option>SaaS & Digital Goods</option>
                        <option>Travel & Hospitality</option>
                        <option>Financial Services</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Team size</label>
                      <select className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] focus:outline-none focus:border-[#000000] text-sm">
                        <option>1-10</option>
                        <option>11-50</option>
                        <option>51-200</option>
                        <option>200+</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 bg-[#000000] hover:bg-[#1D1D1F] text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-1.5 mt-6"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">Step 2 of 4</div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#000000] mt-1">Payment integration</h3>
                  <p className="text-[13px] text-[#6E6E73] mt-1">Select your primary payment gateway adapter.</p>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => setProvider("sandbox")}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      provider === "sandbox"
                        ? "border-[#000000] bg-[#F5F5F7]"
                        : "border-[#E5E5E7] bg-white hover:border-[#D1D1D6]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-sm text-[#000000]">
                      <span>Development Environment (Synthetic Telemetry)</span>
                      {provider === "sandbox" && <CheckCircle2 className="w-4 h-4 text-[#000000]" />}
                    </div>
                    <p className="text-xs text-[#6E6E73] mt-1">
                      Pre-populated with 100 realistic stuck refund scenarios across UPI, Cards, and Netbanking.
                    </p>
                  </div>

                  <div
                    onClick={() => setProvider("razorpay_live")}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      provider === "razorpay_live"
                        ? "border-[#000000] bg-[#F5F5F7]"
                        : "border-[#E5E5E7] bg-white hover:border-[#D1D1D6]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-sm text-[#000000]">
                      <span>Razorpay Live API</span>
                      {provider === "razorpay_live" && <CheckCircle2 className="w-4 h-4 text-[#000000]" />}
                    </div>
                    <p className="text-xs text-[#6E6E73] mt-1">
                      Direct REST API connection using Key ID & Secret configured in server environment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="py-2.5 px-5 bg-white border border-[#E5E5E7] text-[#1D1D1F] rounded-lg font-medium text-sm hover:bg-[#F5F5F7]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-2.5 bg-[#000000] hover:bg-[#1D1D1F] text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">Step 3 of 4</div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#000000] mt-1">Operational volume</h3>
                  <p className="text-[13px] text-[#6E6E73] mt-1">Configure telemetry ingestion rate.</p>
                </div>

                <div className="space-y-3">
                  {["< 100 refunds / mo", "100 - 1,000 refunds / mo", "1,000 - 10,000 refunds / mo", "10,000+ Enterprise"].map((v) => (
                    <div
                      key={v}
                      onClick={() => setVolume(v)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition text-sm font-medium ${
                        volume === v
                          ? "border-[#000000] bg-[#F5F5F7] text-[#000000]"
                          : "border-[#E5E5E7] bg-white text-[#6E6E73] hover:border-[#D1D1D6]"
                      }`}
                    >
                      {v}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="py-2.5 px-5 bg-white border border-[#E5E5E7] text-[#1D1D1F] rounded-lg font-medium text-sm hover:bg-[#F5F5F7]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-2.5 bg-[#000000] hover:bg-[#1D1D1F] text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">Step 4 of 4</div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#000000] mt-1">Autonomy mode</h3>
                  <p className="text-[13px] text-[#6E6E73] mt-1">Choose how the agent executes remediation actions.</p>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => setAutonomyMode("OBSERVE")}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      autonomyMode === "OBSERVE"
                        ? "border-[#000000] bg-[#F5F5F7]"
                        : "border-[#E5E5E7] bg-white hover:border-[#D1D1D6]"
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#000000]">Observe only</div>
                    <div className="text-xs text-[#6E6E73] mt-0.5">Diagnose and log evidence without making API calls.</div>
                  </div>

                  <div
                    onClick={() => setAutonomyMode("APPROVAL_REQUIRED")}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      autonomyMode === "APPROVAL_REQUIRED"
                        ? "border-[#000000] bg-[#F5F5F7]"
                        : "border-[#E5E5E7] bg-white hover:border-[#D1D1D6]"
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#000000]">Approval required (Recommended)</div>
                    <div className="text-xs text-[#6E6E73] mt-0.5">Recommend actions; require human click to dispatch operations.</div>
                  </div>

                  <div
                    onClick={() => setAutonomyMode("AUTONOMOUS")}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      autonomyMode === "AUTONOMOUS"
                        ? "border-[#000000] bg-[#F5F5F7]"
                        : "border-[#E5E5E7] bg-white hover:border-[#D1D1D6]"
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#000000]">Autonomous</div>
                    <div className="text-xs text-[#6E6E73] mt-0.5">Execute bounded actions automatically when all 10 policy checks pass.</div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep(3)}
                    className="py-2.5 px-5 bg-white border border-[#E5E5E7] text-[#1D1D1F] rounded-lg font-medium text-sm hover:bg-[#F5F5F7]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#000000] hover:bg-[#1D1D1F] text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{submitting ? "Configuring..." : "Launch Console →"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
