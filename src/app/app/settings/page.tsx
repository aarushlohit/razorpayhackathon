"use client";

import React from "react";
import Link from "next/link";
import {
  Sliders,
  Zap,
  Layers,
  Shield,
  Users,
  Database,
  ArrowRight,
} from "lucide-react";

export default function SettingsPage() {
  const sections = [
    {
      title: "Autonomy Controls",
      desc: "Configure operational discretion, confidence cutoff limits, and allowed actions.",
      href: "/app/settings/autonomy",
      icon: Sliders,
      badge: "Crucial",
    },
    {
      title: "AI Configuration",
      desc: "Configure Google Gemini, NVIDIA NIM, OpenCode Zen, and fallback order.",
      href: "/app/settings/ai",
      icon: Zap,
    },
    {
      title: "Payment Integrations",
      desc: "Manage server-side Razorpay Test API connection and sandbox adapters.",
      href: "/app/settings/integrations",
      icon: Layers,
    },
    {
      title: "Deterministic Policies",
      desc: "Inspect and configure the 10 code-enforced safety rules.",
      href: "/app/settings/policies",
      icon: Shield,
    },
    {
      title: "Developer Sandbox",
      desc: "Seedable synthetic dataset generator, difficulty controls, and planted failure injection.",
      href: "/app/settings/sandbox",
      icon: Database,
      badge: "Judge Testing",
    },
    {
      title: "Team & Permissions",
      desc: "Manage workspace members and operator roles.",
      href: "/app/settings/team",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Settings</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Configure autonomy boundaries, payment switch adapters, AI providers, and safety limits.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E7] rounded-2xl divide-y divide-[#E5E5E7] shadow-2xs">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="p-5 hover:bg-[#F5F5F7] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center border border-[#E5E5E7]">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#000000]">
                      {s.title}
                    </h3>
                    {s.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] font-medium">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E6E73] mt-0.5">{s.desc}</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-[#86868B] group-hover:text-[#000000] group-hover:translate-x-0.5 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
