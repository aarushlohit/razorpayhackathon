import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Lock, Cpu, UserCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] selection:bg-[#000000] selection:text-white">
      {/* 1. Apple-Inspired Clean Header */}
      <header className="border-b border-[#E5E5E7] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-[15px] tracking-tight text-[#000000]">
            REFUND LOOP
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#6E6E73] font-normal">
            <Link href="#product" className="text-[#000000] font-medium border-b border-[#000000] pb-0.5">
              Product
            </Link>
            <Link href="#process" className="hover:text-[#000000] transition">
              How it works
            </Link>
            <Link href="#security" className="hover:text-[#000000] transition">
              Security
            </Link>
            <Link href="/app/settings/integrations" className="hover:text-[#000000] transition">
              Integrations
            </Link>
            <Link href="#pricing" className="hover:text-[#000000] transition">
              Pricing
            </Link>
            <Link href="/app/audit" className="hover:text-[#000000] transition">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-[13px] text-[#1D1D1F] hover:text-[#000000] transition font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-1 text-[13px] bg-[#000000] text-white font-medium px-4 py-1.5 rounded-full hover:bg-[#1D1D1F] transition shadow-sm"
            >
              Start free
              <span className="text-xs">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Glass Ring Visual */}
      <main id="product" className="max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-7">
            <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">
              AI FOR POST-PAYMENT OPERATIONS
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-[78px] font-bold tracking-[-0.035em] text-[#000000] leading-[1.04]">
              <span className="block overflow-hidden pb-1">
                <span className="inline-block animate-word-1">Refund</span>{" "}
                <span className="inline-block animate-word-2">operations,</span>
              </span>
              <span className="block overflow-hidden">
                <span className="inline-block animate-word-3">without</span>{" "}
                <span className="inline-block animate-word-4">the</span>{" "}
                <span className="inline-block animate-word-5">waiting.</span>
              </span>
            </h1>

            <p className="text-lg sm:text-[19px] text-[#6E6E73] font-normal leading-relaxed max-w-xl">
              Refund Loop investigates stuck refunds, correlates multi-system evidence, executes safe authorized actions, verifies the outcome, and knows when to stop.
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#000000] text-white text-[14px] font-medium rounded-full hover:bg-[#1D1D1F] transition shadow-sm"
              >
                Open Console
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#process"
                className="inline-flex items-center px-7 py-3.5 bg-white border border-[#E5E5E7] text-[#1D1D1F] text-[14px] font-medium rounded-full hover:bg-[#F5F5F7] transition"
              >
                See how it works
              </a>
            </div>

            <div className="pt-2 text-[11px] font-mono tracking-wider text-[#86868B] uppercase">
              BUILT FOR RAZORPAY AI BUILDATHON 2026
            </div>
          </div>

          {/* Right Hero Column: Large Pure Glass Ring Visual */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[540px] sm:max-w-[580px] lg:max-w-[620px] aspect-square flex items-center justify-center">
              <Image
                src="/assets/ring.png"
                alt="Refund Loop Glass Ring"
                width={620}
                height={620}
                priority
                className="w-full h-full object-contain animate-float-subtle select-none pointer-events-none drop-shadow-sm scale-105"
              />
            </div>
          </div>
        </div>

        {/* 3. Upgraded Works With Partner Strip with Real Brand Marks & Subtle Dividers */}
        <div className="mt-20 sm:mt-24 pt-8 border-t border-[#E5E5E7]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium shrink-0">
              WORKS WITH
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 text-[14px] text-[#1D1D1F]">
              {/* Razorpay */}
              <div className="flex items-center gap-2.5 font-medium px-2">
                <img src="/assets/razorpay.png" alt="Razorpay Logo" className="h-6 w-auto object-contain" />
                <span className="font-semibold text-[17px] text-[#000000] tracking-tight">Razorpay</span>
              </div>

              <span className="hidden sm:inline-block text-[#E5E5E7] font-light text-lg">|</span>

              {/* Google Gemini */}
              <div className="flex items-center gap-2.5 font-medium px-2">
                <img src="/assets/gemini.svg" alt="Google Gemini Logo" className="h-6 w-auto object-contain" />
                <span className="text-[17px] text-[#1D1D1F] font-medium tracking-tight">Google Gemini</span>
              </div>

              <span className="hidden sm:inline-block text-[#E5E5E7] font-light text-lg">|</span>

              {/* OpenCode */}
              <div className="flex items-center gap-2.5 font-medium px-2">
                <img src="https://zonalogo.com/assets/opencode-logo.webp?asset=1378&w=320" alt="OpenCode Logo" className="h-6 w-auto object-contain" />
                <span className="text-[17px] text-[#1D1D1F] font-medium tracking-tight">OpenCode</span>
              </div>

              <span className="hidden sm:inline-block text-[#E5E5E7] font-light text-lg">|</span>

              {/* Enterprise Security */}
              <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-[#6E6E73] uppercase px-2">
                <ShieldCheck className="w-4 h-4 text-[#1D1D1F]" />
                <span>ENTERPRISE GRADE SECURITY</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. The Refund Loop Process Section */}
        <section id="process" className="mt-28 sm:mt-36 pt-16 border-t border-[#E5E5E7]">
          <div className="space-y-4 max-w-2xl mb-16">
            <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">
              THE REFUND LOOP
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#000000] leading-tight">
              From uncertainty<br />to resolution.
            </h2>
            <p className="text-[16px] text-[#6E6E73] leading-relaxed">
              A deterministic, auditable, multi-provider AI system for real post-payment operations.
            </p>
            <div>
              <Link href="/app/agent" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#000000] hover:underline">
                Explore the architecture <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* 01 DETECT */}
            <div className="space-y-3 border-t border-[#000000] pt-4">
              <div className="text-[12px] font-mono text-[#86868B]">01</div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#000000]">DETECT</h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Find refunds requiring attention.
              </p>
            </div>

            {/* 02 REASON */}
            <div className="space-y-3 border-t border-[#E5E5E7] pt-4">
              <div className="text-[12px] font-mono text-[#86868B]">02</div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#000000]">REASON</h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Correlate payment evidence and generate a structured diagnosis.
              </p>
            </div>

            {/* 03 ACT */}
            <div className="space-y-3 border-t border-[#E5E5E7] pt-4">
              <div className="text-[12px] font-mono text-[#86868B]">03</div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#000000]">ACT</h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Execute only policy-approved operations.
              </p>
            </div>

            {/* 04 VERIFY */}
            <div className="space-y-3 border-t border-[#E5E5E7] pt-4">
              <div className="text-[12px] font-mono text-[#86868B]">04</div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#000000]">VERIFY</h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Independently confirm the expected outcome.
              </p>
            </div>

            {/* 05 STOP */}
            <div className="space-y-3 border-t border-[#E5E5E7] pt-4">
              <div className="text-[12px] font-mono text-[#86868B]">05</div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#000000]">STOP</h3>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Escalate when confidence, policy, or verification fails.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Security & Trust Blocks */}
        <section id="security" className="mt-32 pt-16 border-t border-[#E5E5E7]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-2">
              <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase font-medium">
                TRUSTED BY MODERN BUSINESSES
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-[#000000]">
                Built for scale.<br />Designed for responsibility.
              </h3>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[#1D1D1F]" />
                </div>
                <h4 className="text-[14px] font-semibold text-[#000000]">Secure by design</h4>
                <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                  Row-level security, cryptographic SHA-256 audit chain, and server-side secret isolation.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#1D1D1F]" />
                </div>
                <h4 className="text-[14px] font-semibold text-[#000000]">Real integrations</h4>
                <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                  Real Razorpay REST API, Google Gemini 2.5 Flash, NVIDIA NIM, and OpenCode Zen.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-[#1D1D1F]" />
                </div>
                <h4 className="text-[14px] font-semibold text-[#000000]">Human-first safety</h4>
                <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                  Bounded autonomy. The agent recommends, deterministic code approves, humans hold the key.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Final Call to Action */}
        <section className="mt-32 pt-16 pb-12 border-t border-[#E5E5E7] text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#000000]">
            Resolve the exception.<br />Not just the ticket.
          </h2>
          <div className="pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#000000] text-white text-[15px] font-medium rounded-full hover:bg-[#1D1D1F] transition shadow-sm"
            >
              Open Console
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E7] py-8 text-center text-[12px] text-[#86868B] font-mono">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>REFUND LOOP © 2026 — RAZORPAY AI BUILDATHON</span>
          <div className="flex items-center gap-6">
            <Link href="/app/audit" className="hover:text-[#000000] transition">Audit Ledger</Link>
            <Link href="/app/settings" className="hover:text-[#000000] transition">Workspace Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
