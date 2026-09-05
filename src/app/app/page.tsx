"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RefundCase, AuditLogEntry } from "@/types";
import { ArrowRight, ChevronRight, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";

interface OverviewMetrics {
  totalCases: number;
  limboCount: number;
  resolvedCount: number;
  escalatedCount: number;
  totalValueLimbo: number;
  totalValueResolved: number;
  medianInvestigationSeconds: number | null;
}

export default function DashboardOverviewPage() {
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/cases").then((r) => r.json()),
      fetch("/api/audit").then((r) => r.json()),
    ])
      .then(([casesRes, auditRes]) => {
        if (casesRes.success) {
          setCases(casesRes.data.cases || []);
          setMetrics(casesRes.data.metrics || null);
        }
        if (auditRes.success) {
          setAuditLogs(auditRes.data.logs || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const [runningLoop, setRunningLoop] = useState(false);
  const [lastBatchMessage, setLastBatchMessage] = useState<string | null>(null);

  const reloadData = async () => {
    const [casesRes, auditRes] = await Promise.all([
      fetch("/api/cases").then((r) => r.json()),
      fetch("/api/audit").then((r) => r.json()),
    ]);
    if (casesRes.success) {
      setCases(casesRes.data.cases || []);
      setMetrics(casesRes.data.metrics || null);
    }
    if (auditRes.success) {
      setAuditLogs(auditRes.data.logs || []);
    }
  };

  const handleRunAgents = async () => {
    setRunningLoop(true);
    setLastBatchMessage(null);
    try {
      const res = await fetch("/api/agent/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 4 }),
      });
      const data = await res.json();
      if (data.success) {
        setLastBatchMessage(
          `Autonomous AI Loop completed: processed ${data.data.processed} refunds (₹${(data.data.totalResolved || 0).toLocaleString("en-IN")} recovered).`
        );
        await reloadData();
      }
    } finally {
      setRunningLoop(false);
    }
  };

  const attentionCases = cases.filter(
    (c) => c.current_status === "LIMBO" || c.current_status.startsWith("ESCALATED")
  );

  const limboCases = cases.filter((c) => c.current_status === "LIMBO");
  const resolvedCases = cases.filter((c) => c.current_status === "RESOLVED");

  // Chart 1: Failure Stages Distribution (Donut / Pie Chart)
  const failureStages: Record<string, { label: string; count: number; color: string }> = {
    WEBHOOK_MISSING: { label: "Webhook Timeout", count: 0, color: "#2563EB" },
    BANK_LEG_STUCK: { label: "Bank Switch Stalled", count: 0, color: "#EA580C" },
    LEDGER_MISMATCH: { label: "Ledger Desync", count: 0, color: "#9333EA" },
    INVALID_DESTINATION: { label: "Destination Leg", count: 0, color: "#DC2626" },
    AMBIGUOUS: { label: "Ambiguous Leg", count: 0, color: "#4B5563" },
  };

  cases.forEach((c) => {
    const stage = c.failure_class || "AMBIGUOUS";
    if (failureStages[stage]) {
      failureStages[stage].count += 1;
    } else {
      failureStages.AMBIGUOUS.count += 1;
    }
  });

  const pieData = Object.values(failureStages).filter((d) => d.count > 0);
  const totalPieCount = pieData.reduce((acc, d) => acc + d.count, 0) || 1;

  // Chart 2: Resolution Statuses (Bar Graph)
  const statusBars = [
    { label: "Resolved", count: resolvedCases.length, color: "#16A34A" },
    { label: "Needs Attention", count: attentionCases.length, color: "#EA580C" },
    { label: "Limbo Queue", count: limboCases.length, color: "#2563EB" },
  ];
  const maxBarCount = Math.max(...statusBars.map((b) => b.count), 1);

  // Format natural language activity from real audit trail & cases
  const recentDiagnosedCases = cases
    .filter((c) => c.latest_diagnosis)
    .slice(0, 4);

  return (
    <div className="space-y-12 max-w-5xl pb-16">
      {/* ─── 1. Calm Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E5E5E7] pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#000000]">
            Good afternoon, Aarush.
          </h1>
          <p className="text-[14px] text-[#6E6E73]">
            Your refund operations are monitored by the Refund Loop Autonomous Engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-[#E5E5E7] text-[12px] font-mono text-[#1D1D1F]">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span>Agents Online</span>
            <span className="text-[#86868B]">· active</span>
          </div>

          <button
            onClick={handleRunAgents}
            disabled={runningLoop}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#000000] text-white text-[13px] font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-xs"
          >
            {runningLoop ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>RUNNING... AGENTS</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-ping" />
                <span>RUN AGENTS</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              const headers = ["Case ID,Merchant,Amount,Failure Class,Status,Age Days"];
              const csvData = cases.map(c => `${c.case_id},"${c.merchant_name}",${c.amount},${c.failure_class},${c.current_status},${c.age_days}`);
              const blob = new Blob([headers.concat(csvData).join("\n")], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `refund_cases_${Date.now()}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] text-[13px] font-medium rounded-full hover:bg-[#E5E5E7] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/app/recovery"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] text-[13px] font-medium rounded-full hover:bg-[#E5E5E7] transition"
          >
            <span>Review attention</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Batch Notification */}
      {lastBatchMessage && (
        <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-mono text-[#166534] flex items-center justify-between">
          <span>{lastBatchMessage}</span>
          <span className="text-[11px] text-[#15803D]">Updated just now</span>
        </div>
      )}

      {/* ─── 2. Hero Operational Summary & Metrics ─────────────────────── */}
      <div className="py-2 space-y-6">
        <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
          EXECUTIVE REFUND OPERATIONS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-1">
            <div className="text-[12px] text-[#6E6E73]">Trapped Liability (Limbo)</div>
            <div className="text-3xl font-bold tracking-tight text-[#000000] font-mono">
              ₹{(metrics?.totalValueLimbo ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-[#86868B] pt-1">
              {limboCases.length} refunds requiring diagnosis
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-1">
            <div className="text-[12px] text-[#6E6E73]">Capital Recovered</div>
            <div className="text-3xl font-bold tracking-tight text-[#16A34A] font-mono">
              ₹{(metrics?.totalValueResolved ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-[#15803D] pt-1">
              {resolvedCases.length} refunds verified settled
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-1">
            <div className="text-[12px] text-[#6E6E73]">Autonomous Resolution Rate</div>
            <div className="text-3xl font-bold tracking-tight text-[#000000] font-mono">
              {cases.length > 0 ? ((resolvedCases.length / cases.length) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[11px] text-[#86868B] pt-1">
              Cryptographic 10-point agentic policy enforcement
            </div>
          </div>
        </div>

        {/* ─── 3. Visual Charts (Pie Chart & Bar Graph) ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Pie / Donut Chart: Failure Root Causes */}
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F0F2] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#000000]">Refund Failure Stages</h3>
                <p className="text-[12px] text-[#6E6E73]">Breakdown of cross-system payment anomalies</p>
              </div>
              <span className="text-xs font-mono text-[#86868B]">{cases.length} Total</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* SVG Donut Chart */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {(() => {
                    let cumulative = 0;
                    return pieData.map((slice, idx) => {
                      const strokeDasharray = `${(slice.count / totalPieCount) * 283} 283`;
                      const strokeDashoffset = `-${(cumulative / totalPieCount) * 283}`;
                      cumulative += slice.count;
                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="10"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-mono text-[#000000]">{cases.length}</span>
                  <span className="text-[10px] text-[#86868B] uppercase tracking-wider">Cases</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs w-full">
                {pieData.map((slice, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="text-[#1D1D1F]">{slice.label}</span>
                    </div>
                    <div className="font-mono text-[#6E6E73]">
                      {slice.count} <span className="text-[#86868B]">({((slice.count / totalPieCount) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Graph: Pipeline Statuses */}
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F0F2] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#000000]">Pipeline Resolution Distribution</h3>
                <p className="text-[12px] text-[#6E6E73]">Operational status velocity across queue</p>
              </div>
              <span className="text-xs font-mono text-[#86868B]">Live</span>
            </div>

            <div className="space-y-4 pt-3">
              {statusBars.map((bar, idx) => {
                const pct = ((bar.count / maxBarCount) * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1D1D1F]">{bar.label}</span>
                      <span className="font-mono text-[#6E6E73]">{bar.count} cases</span>
                    </div>
                    <div className="w-full bg-[#F5F5F7] h-3 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: bar.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 text-[11px] text-[#86868B] font-mono flex items-center justify-between border-t border-[#F0F0F2]">
                <span>0 min</span>
                <span>Automated resolution pipeline active</span>
                <span>Max: {maxBarCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle AI Status Line */}
        <div className="flex items-center gap-3 pt-2 text-[12px] text-[#6E6E73] font-mono border-t border-[#E5E5E7]">
          <span className="flex items-center gap-1.5 text-[#1D1D1F] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#000000]" />
            AI operator active
          </span>
          <span>·</span>
          <span>Investigating: Webhook delivery anomalies & NPCI settlement syncs</span>
        </div>
      </div>

      {/* ─── 3. AI Activity (Centerpiece Feed) ───────────────────────────── */}
      <div className="space-y-6 pt-4 border-t border-[#E5E5E7]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#000000]">
              AI Activity
            </h2>
            <p className="text-[13px] text-[#6E6E73]">
              Natural language observations and recommendations from autonomous investigations.
            </p>
          </div>
          <Link
            href="/app/agent/decisions"
            className="text-xs text-[#000000] font-medium hover:underline inline-flex items-center gap-1"
          >
            View all decisions <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-[#E5E5E7] border-y border-[#E5E5E7]">
          {recentDiagnosedCases.length > 0 ? (
            recentDiagnosedCases.map((c) => {
              const diag = c.latest_diagnosis!;
              const assessment = diag.assessment;
              const isResolved = c.current_status === "RESOLVED";
              const isEscalated = c.current_status.startsWith("ESCALATED");

              return (
                <div key={c.case_id} className="py-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isResolved
                            ? "bg-[#34C759]"
                            : isEscalated
                            ? "bg-[#FF9500]"
                            : "bg-[#000000]"
                        }`}
                      />
                      <span className="font-mono text-xs font-semibold text-[#000000]">
                        {isResolved ? "Verified" : isEscalated ? "Recommendation · Review" : "Investigating"}
                      </span>
                      <span className="text-xs text-[#86868B] font-mono">
                        {c.case_id} · {c.merchant_name}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-[#000000] font-medium">
                      ₹{c.amount.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <p className="text-[13px] text-[#1D1D1F] leading-relaxed">
                    {assessment?.summary ||
                      diag.reasoning ||
                      `Cross-system correlation completed for ${c.merchant_name}.`}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3 text-xs text-[#6E6E73] font-mono">
                      <span>{diag.confidence !== null && typeof diag.confidence === "number" ? `${(diag.confidence * 100).toFixed(0)}% confidence` : "NO AI DIAGNOSIS"}</span>
                      <span>·</span>
                      <span className="capitalize">{diag.provider}</span>
                      {diag.latency_ms && (
                        <>
                          <span>·</span>
                          <span>{diag.latency_ms}ms</span>
                        </>
                      )}
                    </div>

                    <Link
                      href={`/app/recovery/${c.case_id}`}
                      className="text-xs text-[#000000] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Review investigation <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-[#86868B] font-mono">
              No recent investigations logged yet. Click &quot;Review attention&quot; to begin.
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. Priority Refunds Requiring Action ────────────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#000000]">
              Refunds Requiring Attention
            </h2>
            <p className="text-xs text-[#6E6E73]">
              High liability or customer-impacting cases prioritized by the AI.
            </p>
          </div>
          <Link
            href="/app/recovery"
            className="text-xs text-[#000000] font-medium hover:underline"
          >
            View all ({attentionCases.length}) →
          </Link>
        </div>

        <div className="divide-y divide-[#E5E5E7] border-y border-[#E5E5E7]">
          {attentionCases.slice(0, 5).map((c) => (
            <Link
              key={c.case_id}
              href={`/app/recovery/${c.case_id}`}
              className="py-4 flex items-center justify-between gap-4 group hover:bg-[#FBFBFC] transition px-2 rounded-lg -mx-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#000000]">
                    {c.case_id}
                  </span>
                  <span className="text-xs text-[#6E6E73]">·</span>
                  <span className="text-xs text-[#1D1D1F] font-medium">
                    {c.merchant_name}
                  </span>
                </div>
                <div className="text-xs text-[#6E6E73]">
                  {c.failure_class.replace(/_/g, " ")} · {c.age_days} days in limbo
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right font-mono">
                  <div className="text-xs font-semibold text-[#000000]">
                    ₹{c.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-[#86868B]">
                    {c.current_status}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#86868B] group-hover:text-[#000000] transition" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
