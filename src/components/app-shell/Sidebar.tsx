"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  RotateCcw,
  Bot,
  BrainCircuit,
  FileText,
  Sliders,
  Settings,
  Shield,
  Layers,
  Database,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Workspace, User } from "@/types";

interface SidebarProps {
  workspace: Workspace | null;
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ workspace, user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({
    attention: 0,
    processing: 0,
    resolved: 0,
    escalated: 0,
  });

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.metrics) {
          setCounts({
            attention: res.data.metrics.limboCount,
            processing: res.data.metrics.processingCount || 0,
            resolved: res.data.metrics.resolvedCount,
            escalated: res.data.metrics.escalatedCount,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems = [
    { label: "Overview", href: "/app", icon: LayoutDashboard },
    {
      label: "Recovery Queue",
      href: "/app/recovery",
      icon: RotateCcw,
      subCount: counts.attention,
    },
    { label: "Agent Center", href: "/app/agent", icon: Bot },
    { label: "AI Decisions", href: "/app/agent/decisions", icon: BrainCircuit },
    { label: "Audit Ledger", href: "/app/audit", icon: FileText },
  ];

  const settingsItems = [
    { label: "Autonomy Controls", href: "/app/settings/autonomy", icon: Sliders },
    { label: "AI Configuration", href: "/app/settings/ai", icon: Zap },
    { label: "Integrations", href: "/app/settings/integrations", icon: Layers },
    { label: "Policy Rules", href: "/app/settings/policies", icon: Shield },
    { label: "Developer Sandbox", href: "/app/settings/sandbox", icon: Database },
  ];

  return (
    <aside className="w-64 bg-[#080b12] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      {/* Brand & Workspace Header */}
      <div>
        <div className="h-14 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-xs shadow-md shadow-blue-500/20">
              RL
            </div>
            <span className="font-bold tracking-tight text-white text-sm">REFUND LOOP</span>
          </Link>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PRO
          </span>
        </div>

        {/* Workspace Switcher Pill */}
        <div className="p-3">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
            <div className="truncate">
              <div className="font-semibold text-slate-200 truncate">
                {workspace?.name || "Enterprise Workspace"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono capitalize">
                {workspace?.provider === "razorpay_test" ? "Razorpay Test Mode" : "Developer Sandbox"}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
        </div>

        {/* Main Nav */}
        <div className="px-3 py-1 space-y-0.5">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Core Operations
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.subCount !== undefined && item.subCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {item.subCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Nav */}
        <div className="px-3 py-3 space-y-0.5 border-t border-slate-800/60 mt-3">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Configuration
          </div>
          {settingsItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User & Agent Health Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs px-1 mb-2.5 font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Agent Worker Online
          </span>
          <span className="text-[10px] text-slate-500">v2.0</span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="truncate">
            <div className="font-medium text-slate-200 truncate">{user?.name || "Operator"}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.email || "demo@razorpay.com"}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
