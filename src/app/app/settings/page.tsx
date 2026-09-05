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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Governance</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure autonomous boundaries, payment switch adapters, and AI models.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  {s.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
                      {s.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-xs text-blue-400 font-semibold gap-1">
                <span>Configure</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
