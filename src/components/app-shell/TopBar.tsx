"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Shield, Database, ExternalLink, Play, Sparkles } from "lucide-react";
import { Workspace } from "@/types";

interface TopBarProps {
  workspace: Workspace | null;
}

export const TopBar: React.FC<TopBarProps> = ({ workspace }) => {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return ["Overview"];
    return parts.slice(1).map((p) => p.replace(/-/g, " ").toUpperCase());
  };

  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#080b12]/90 backdrop-blur px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <Link href="/app" className="hover:text-slate-200">App</Link>
        {getBreadcrumbs().map((b, i) => (
          <React.Fragment key={b + i}>
            <span>/</span>
            <span className={i === getBreadcrumbs().length - 1 ? "text-slate-200 font-semibold" : ""}>
              {b}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Center Search / Command */}
      <div className="hidden sm:flex items-center relative w-72">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search refunds, merchants, UTRs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>

      {/* Right Badges & Controls */}
      <div className="flex items-center gap-3 text-xs">
        {workspace?.provider === "razorpay_test" ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            RAZORPAY TEST MODE
          </span>
        ) : (
          <Link
            href="/app/settings/sandbox"
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
          >
            <Database className="w-3 h-3" />
            DEVELOPER SANDBOX
          </Link>
        )}

        <Link
          href="/app/recovery"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run Recovery</span>
        </Link>
      </div>
    </header>
  );
};
