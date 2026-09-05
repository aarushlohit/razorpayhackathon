"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Play,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { AuditLogEntry } from "@/types";

export default function AgentCenterPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [casesRes, auditRes] = await Promise.all([
        fetch("/api/cases"),
        fetch("/api/audit"),
      ]);
      const casesData = await casesRes.json();
      const auditData = await auditRes.json();

      if (casesData.success) {
        setMetrics(casesData.data.metrics);
      }
      if (auditData.success) {
        setLogs(auditData.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunBatch = async () => {
    setRunning(true);
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      await fetchData();
    } finally {
      setRunning(false);
    }
  };

  const handleStep = async () => {
    setStepping(true);
    try {
      await fetch("/api/agent/step", { method: "POST" });
      await fetchData();
    } finally {
      setStepping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Agent Operations Center</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time execution telemetry from backend payment operations workers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleStep}
            disabled={stepping || running}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <SkipForward className="w-3.5 h-3.5 text-blue-400" />
            <span>{stepping ? "Stepping..." : "Step Single Case"}</span>
          </button>
          <button
            onClick={handleRunBatch}
            disabled={running || stepping}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{running ? "Processing Batch..." : "Run Autonomous Batch"}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Agent Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Processed & Resolved</div>
          <div className="text-2xl font-bold text-white mt-1.5">{metrics?.resolvedCount || 0}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Closed loop confirmed</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Escalated (Safe Gates)</div>
          <div className="text-2xl font-bold text-white mt-1.5">{metrics?.escalatedCount || 0}</div>
          <div className="text-[11px] text-amber-400 mt-0.5">Low conf / high value / failed</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Median Latency</div>
          <div className="text-2xl font-bold text-white mt-1.5">{metrics?.medianInvestigationSeconds || 2.4}s</div>
          <div className="text-[11px] text-slate-400 mt-0.5">5 telemetry queries</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Autonomy</div>
          <div className="text-lg font-bold text-blue-400 mt-2 truncate">APPROVAL REQUIRED</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dual-signoff protected</div>
        </div>
      </div>

      {/* Real-Time Telemetry Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Live Activity Stream (Real Backend Operations)</span>
          </div>
          <Link href="/app/audit" className="text-xs text-blue-400 hover:underline">
            View full audit ledger →
          </Link>
        </div>

        <div className="space-y-2.5 font-mono text-xs max-h-[500px] overflow-y-auto">
          {logs.slice(0, 30).map((l) => (
            <div
              key={l.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1 text-slate-300"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-200">
                    {l.stage}
                  </span>
                  {l.case_id !== "SYSTEM" && (
                    <Link href={`/app/recovery/${l.case_id}`} className="text-blue-400 hover:underline font-bold">
                      {l.case_id}
                    </Link>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    l.status === "SUCCESS"
                      ? "text-emerald-400"
                      : l.status === "WARNING"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {l.status}
                </span>
              </div>
              <div className="text-slate-300 font-sans text-xs mt-0.5">{l.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
