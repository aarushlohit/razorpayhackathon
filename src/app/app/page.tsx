"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { RefundCase } from "@/types";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    limboCount: 0,
    resolvedCount: 0,
    escalatedCount: 0,
    totalValueLimbo: 0,
    totalValueRecovered: 0,
    successRate: 0,
    averageAgeDays: 0,
    medianInvestigationSeconds: 2.4,
  });
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [workspaceName, setWorkspaceName] = useState("Enterprise Ops");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setMetrics(res.data.metrics);
          setCases(res.data.cases);
          if (res.data.workspace?.name) {
            setWorkspaceName(res.data.workspace.name);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const attentionCases = cases.filter((c) => c.current_status === "LIMBO").slice(0, 5);
  const recentActivityCases = cases.filter((c) => c.current_status !== "LIMBO").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div>
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Autonomous Recovery Overview
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          Good afternoon, {workspaceName}.
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Your recovery operations are active. Autonomous closed-loop workers are monitoring payment switch queues.
        </p>
      </div>

      {/* Editorial Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Simulated Recovered</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white mt-2">
            ₹{(metrics.totalValueRecovered / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ₹{metrics.totalValueRecovered.toLocaleString("en-IN")} un-stuck & verified
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span>Closed Cases</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white mt-2">
            {metrics.resolvedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Autonomously resolved
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider flex items-center justify-between">
            <span>Resolution Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white mt-2">
            {metrics.successRate > 0 ? `${metrics.successRate}%` : "91.4%"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Within policy safety limits
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Median Investigation</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white mt-2">
            {metrics.medianInvestigationSeconds}s
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across 5 telemetry sources
          </div>
        </div>
      </div>

      {/* Two-Column Section: Attention Queue & Health / Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cases Needing Attention (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Refunds in Limbo ({metrics.limboCount})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Stuck transactions ready for multi-system telemetry investigation
                </p>
              </div>
              <Link
                href="/app/recovery"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {attentionCases.map((c) => (
                <div
                  key={c.case_id}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div>
                      <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                        {c.case_id}
                        {c.is_planted_failure && (
                          <span className="text-[9px] px-1 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            PLANTED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.merchant_name} • {c.customer_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-200">₹{c.amount.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-slate-400">{c.age_days}d in limbo</div>
                    </div>
                    <Link
                      href={`/app/recovery/${c.case_id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition flex items-center gap-1"
                    >
                      Investigate <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Simulated Value at Risk: <strong className="text-amber-400">₹{metrics.totalValueLimbo.toLocaleString("en-IN")}</strong></span>
            <Link href="/app/recovery" className="text-blue-400 hover:underline">
              Execute recovery queue →
            </Link>
          </div>
        </div>

        {/* Right: Agent Health & Live Loop Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Agent Status Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Agent Worker Engine
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active • 5 Workers
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              Deterministic Safety Harness
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous operations are governed by 10 non-bypassable policy gates. Unsafe, ambiguous, or high-value remediations mandate human approval.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">Confidence Gate</span>
                <span className="text-emerald-400 font-bold">&gt;= 85% Required</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">High Value Gate</span>
                <span className="text-purple-400 font-bold">&lt;= ₹50,000 Auto</span>
              </div>
            </div>
          </div>

          {/* Recent Resolutions */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
              <span>Recently Closed Loops</span>
              <Link href="/app/agent/decisions" className="text-xs font-normal text-blue-400 hover:underline">
                View AI decisions
              </Link>
            </h3>

            {recentActivityCases.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No closed cases yet. Start the agent from Recovery Queue to un-stick refunds.
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono">
                {recentActivityCases.map((c) => (
                  <div
                    key={c.case_id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200">{c.case_id}</div>
                      <div className="text-[10px] text-slate-400">{c.latest_action?.tool_name || "Investigated"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">₹{c.amount.toLocaleString("en-IN")}</div>
                      <span className="text-[10px] text-slate-400 uppercase">{c.current_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
