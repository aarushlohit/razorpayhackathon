"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Activity,
  Server,
  Layers,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const steps = [
    {
      title: "1. Detect",
      subtitle: "Asynchronous Limbo",
      badge: "TRIGGERED",
      color: "border-slate-700 bg-slate-900 text-slate-300",
      content: {
        caseId: "RF_8A21",
        amount: "₹4,200",
        age: "6 days in processing limbo",
        merchant: "Zomato Gold Delivery",
        status: "Refund initiated at checkout, no customer confirmation callback for 144 hours.",
      },
    },
    {
      title: "2. Investigate",
      subtitle: "Cross-System Telemetry",
      badge: "5 TELEMETRY LEGS",
      color: "border-cyan-800 bg-cyan-950/40 text-cyan-300",
      content: {
        signals: [
          { name: "Payment Gateway", status: "ACKNOWLEDGED", ok: true },
          { name: "Acquiring Bank Switch", status: "CREDIT_CONFIRMED", ok: true },
          { name: "Webhook Dispatcher", status: "FAILED_TIMEOUT (HTTP 504)", ok: false },
          { name: "Beneficiary Handle", status: "VALID_ACTIVE", ok: true },
          { name: "Accounting Ledger", status: "REFUNDED", ok: true },
        ],
      },
    },
    {
      title: "3. Diagnose",
      subtitle: "Real AI Model Reasoning",
      badge: "CONFIDENCE: 96%",
      color: "border-indigo-800 bg-indigo-950/40 text-indigo-300",
      content: {
        provider: "Gemini 2.5 Flash",
        diagnosis: "WEBHOOK_MISSING",
        confidence: 0.96,
        reasoning: "Gateway and issuing bank confirmed customer credit reversal, but merchant webhook delivery timed out after 3 retry windows.",
        action: "resend_webhook",
      },
    },
    {
      title: "4. Policy Gate",
      subtitle: "Deterministic Code Guard",
      badge: "10 RULES EVALUATED",
      color: "border-emerald-800 bg-emerald-950/40 text-emerald-300",
      content: {
        checks: [
          { rule: "Confidence >= 85%", passed: true, note: "96% observed" },
          { rule: "Amount <= ₹50,000 limit", passed: true, note: "₹4,200 within autonomous boundary" },
          { rule: "Attempts < 1 limit", passed: true, note: "0 previous retries" },
          { rule: "Whitelist validation", passed: true, note: "resend_webhook is authorized" },
        ],
        decision: "AUTONOMOUS REMEDIATION APPROVED",
      },
    },
    {
      title: "5. Act & Verify",
      subtitle: "Closed-Loop Execution",
      badge: "OUTCOME VERIFIED",
      color: "border-blue-800 bg-blue-950/40 text-blue-300",
      content: {
        actionRun: "resend_webhook(RF_8A21)",
        result: "HTTP 200 OK received from merchant webhook worker.",
        verification: "Database status queried: All 5 legs synchronized.",
        outcome: "₹4,200 simulated revenue recovered & case closed.",
      },
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top Notice */}
      <div className="border-b border-slate-800/80 bg-slate-950 px-4 py-2 text-center text-xs text-slate-400 font-mono">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
        Built for Razorpay AI Buildathon 2026 • AI Revenue Recovery Track
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-800/60 bg-[#07090e]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-white shadow-md shadow-blue-500/20">
              RL
            </div>
            <span className="font-bold tracking-tight text-slate-100 text-sm">
              REFUND LOOP
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-200 transition">How it works</a>
            <a href="#safety" className="hover:text-slate-200 transition">Safety Model</a>
            <a href="#architecture" className="hover:text-slate-200 transition">Architecture</a>
            <a href="#integrations" className="hover:text-slate-200 transition">Integrations</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              Start recovering revenue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AUTONOMOUS CLOSED-LOOP PAYMENT OPERATIONS
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] uppercase">
            Refund Operations, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-slate-200">
              Without the Waiting.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Refund Loop investigates stuck refunds, correlates multi-system evidence, executes the safest authorized action, verifies the outcome, and knows when to stop.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
            >
              Launch Live App Console
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              Judge Quick Demo Access
            </Link>
          </div>

          <div className="mt-6 text-xs text-slate-500 font-mono">
            Deterministic Safety Gate • Real Multi-Provider AI • Closed-Loop Verification
          </div>
        </div>

        {/* Interactive Closed-Loop Hero Preview */}
        <div className="mt-14 max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
                Autonomous Closed-Loop Demo
              </span>
              <h2 className="text-sm font-bold text-slate-200">
                Live Resolution Lifecycle: RF_8A21
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <button
                  key={s.title}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveStep(idx);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                    activeStep === idx
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.title.split(". ")[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Current Step Card */}
          <div className="mt-6 min-h-[220px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {steps[activeStep].subtitle}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${steps[activeStep].color}`}>
                  {steps[activeStep].badge}
                </span>
              </div>

              {/* Dynamic Step View */}
              {activeStep === 0 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Refund: <strong className="text-white">{steps[0].content.caseId}</strong></span>
                    <span className="text-amber-400 font-bold">{steps[0].content.amount}</span>
                  </div>
                  <div className="text-slate-400">Merchant: {steps[0].content.merchant}</div>
                  <div className="text-slate-500">{steps[0].content.status}</div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {steps[1].content.signals?.map((sig) => (
                    <div
                      key={sig.name}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                    >
                      <span className="text-slate-300">{sig.name}</span>
                      <span className={`text-[11px] font-bold ${sig.ok ? "text-emerald-400" : "text-rose-400"}`}>
                        {sig.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeStep === 2 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-indigo-300 font-bold">Diagnosed: {steps[2].content.diagnosis}</span>
                    <span className="text-emerald-400 font-bold">Confidence: 96%</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{steps[2].content.reasoning}</p>
                  <div className="text-[11px] font-mono text-slate-400">
                    Recommended Safe Action: <span className="text-blue-400 font-bold">{steps[2].content.action}()</span>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {steps[3].content.checks?.map((chk) => (
                      <div key={chk.rule} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{chk.rule} ({chk.note})</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800 text-emerald-400 font-bold text-center">
                    {steps[3].content.decision}
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span>Action Executed: {steps[4].content.actionRun}</span>
                  </div>
                  <div className="text-slate-400 pl-6">{steps[4].content.result}</div>
                  <div className="text-emerald-400 pl-6 flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {steps[4].content.verification}
                  </div>
                  <div className="text-white font-bold bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-lg text-center mt-2">
                    {steps[4].content.outcome}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Step {activeStep + 1} of 5</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-blue-400 hover:text-blue-300 font-mono"
              >
                {isPlaying ? "Pause autoplay" : "Resume autoplay"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-6 border-t border-slate-800/60 bg-slate-950/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">
              The Fundamental Problem
            </h3>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Most systems tell you a refund is stuck.<br />
              Refund Loop investigates why.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-mono font-bold mb-4">
                01
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Asynchronous Blind Spots</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Refunds cross 5 independent systems: Gateways, Bank Switches, Webhook Queues, Beneficiary Accounts, and Ledgers. A breakdown in any one leg leaves the merchant blind.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold mb-4">
                02
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Manual Ticket Hell</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Support desks waste thousands of hours manually checking UTR numbers, resending webhook payloads, and answering &ldquo;Where is my refund?&rdquo; tickets.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-bold mb-4">
                03
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Passive AI Failure</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chatbots and predictive dashboards only summarize delays. They don&apos;t take safe bounded actions, and they never verify whether the action actually worked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Three Pillars */}
      <section id="how-it-works" className="py-20 px-6 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">
              The Three Pillars
            </h3>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Autonomy With Guardrails.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">1. Investigate</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Correlate evidence across Payment Gateways, NPCI Switches, Webhook Workers, and Accounting Ledgers. The agent never guesses—it reads real telemetry.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">2. Act</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consequential actions pass a 10-rule deterministic policy gate. Low confidence ($&lt; 85\%$) or high value ($&gt; ₹50k$) immediately escalates to human dual-signoff.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">3. Verify</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Never assume an action succeeded. The agent queries database state post-execution. If the refund is still pending, it halts retries and escalates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 px-6 border-t border-slate-800/60 bg-[#080c14]">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold mb-3">
              <Lock className="w-4 h-4" />
              ENTERPRISE SAFETY ARCHITECTURE
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              &ldquo;The model can reason. The policy decides whether it may act. Verification decides whether it actually worked.&rdquo;
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Unlike generic AI agent frameworks that give models raw tool-calling power over financial operations, Refund Loop strictly separates probabilistic reasoning from deterministic execution.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="text-slate-500 text-[10px]">RULE 1</div>
                <div className="font-bold text-white mt-0.5">Confidence &lt; 85%</div>
                <div className="text-[10px] text-amber-400 mt-1">Escalate to Human</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="text-slate-500 text-[10px]">RULE 2</div>
                <div className="font-bold text-white mt-0.5">Amount &gt; ₹50,000</div>
                <div className="text-[10px] text-purple-400 mt-1">Dual Signoff</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="text-slate-500 text-[10px]">RULE 3</div>
                <div className="font-bold text-white mt-0.5">Max 1 Attempt</div>
                <div className="text-[10px] text-blue-400 mt-1">No Infinite Loops</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="text-slate-500 text-[10px]">RULE 5</div>
                <div className="font-bold text-white mt-0.5">Mandatory Verify</div>
                <div className="text-[10px] text-emerald-400 mt-1">Catches Failures</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-slate-800/60 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to close the refund loop?
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Sign in as a demo operator or create a dedicated workspace in seconds.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition"
            >
              Sign In to Console
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition"
            >
              Create Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 font-mono">
        <div>REFUND LOOP • Razorpay AI Buildathon 2026 Submission</div>
        <div className="mt-1 text-slate-600">
          Simulated Payment Operations Environment with Real AI Diagnostic Architecture.
        </div>
      </footer>
    </div>
  );
}
