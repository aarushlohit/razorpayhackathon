"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Play,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { RefundCase, CaseStatus } from "@/types";

export default function RecoveryQueuePage() {
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [filter, setFilter] = useState<"ALL" | "LIMBO" | "RESOLVED" | "ESCALATED" | "PLANTED">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.success) {
        setCases(data.data.cases);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filter === "LIMBO" && c.current_status !== "LIMBO") return false;
      if (filter === "RESOLVED" && c.current_status !== "RESOLVED") return false;
      if (filter === "ESCALATED" && !c.current_status.startsWith("ESCALATED")) return false;
      if (filter === "PLANTED" && !c.is_planted_failure) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.case_id.toLowerCase().includes(q) ||
          c.refund_id.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q) ||
          c.merchant_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cases, filter, search]);

  const handleStepNext = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/agent/step", { method: "POST" });
      const data = await res.json();
      await fetchCases();
    } finally {
      setProcessing(false);
    }
  };

  const handleRunBatch = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 12 }),
      });
      await res.json();
      await fetchCases();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Recovery Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Investigate stuck refunds, execute bounded remediations, and verify resolution outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleStepNext}
            disabled={processing}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <SkipForward className="w-3.5 h-3.5 text-blue-400" />
            <span>Step Next Case</span>
          </button>
          <button
            onClick={handleRunBatch}
            disabled={processing}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{processing ? "Processing..." : "Run Batch (12 Cases)"}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Filter Toolbar */}
        <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(["ALL", "LIMBO", "RESOLVED", "ESCALATED", "PLANTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  filter === tab
                    ? "bg-slate-800 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "PLANTED" ? "Planted Failures" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search case, merchant, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 font-mono"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">CASE / REFUND</th>
                <th className="py-3 px-4 font-semibold">MERCHANT & USER</th>
                <th className="py-3 px-4 font-semibold text-right">AMOUNT</th>
                <th className="py-3 px-4 font-semibold">AGE</th>
                <th className="py-3 px-4 font-semibold">DIAGNOSIS</th>
                <th className="py-3 px-4 font-semibold">CONFIDENCE</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredCases.map((c) => (
                <tr key={c.case_id} className="hover:bg-slate-800/40 transition">
                  {/* Case / Refund */}
                  <td className="py-3 px-4 font-mono">
                    <Link
                      href={`/app/recovery/${c.case_id}`}
                      className="font-bold text-slate-200 hover:text-blue-400 flex items-center gap-1.5 transition"
                    >
                      {c.case_id}
                      {c.is_planted_failure && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          PLANTED
                        </span>
                      )}
                    </Link>
                    <div className="text-[10px] text-slate-500">{c.refund_id}</div>
                  </td>

                  {/* Merchant & Customer */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-200 truncate max-w-[150px]">{c.merchant_name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.customer_name}</div>
                  </td>

                  {/* Amount */}
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span className={c.amount > 50000 ? "text-purple-300" : "text-white"}>
                      ₹{c.amount.toLocaleString("en-IN")}
                    </span>
                    {c.amount > 50000 && (
                      <span className="text-[9px] text-purple-400 block font-normal">High Value</span>
                    )}
                  </td>

                  {/* Age */}
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {c.age_days}d
                  </td>

                  {/* Diagnosis */}
                  <td className="py-3 px-4">
                    {c.latest_diagnosis ? (
                      <div className="text-slate-200 font-medium capitalize font-mono text-[11px]">
                        {c.latest_diagnosis.likely_stage.replace(/_/g, " ")}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Pending AI run</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-4">
                    {c.latest_diagnosis ? (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                          c.latest_diagnosis.confidence >= 0.85
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        }`}
                      >
                        {(c.latest_diagnosis.confidence * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {c.current_status === "LIMBO" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> LIMBO
                      </span>
                    )}
                    {c.current_status === "RESOLVED" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> RESOLVED
                      </span>
                    )}
                    {c.current_status === "ESCALATED_LOW_CONFIDENCE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        <HelpCircle className="w-3 h-3" /> LOW CONF ESCALATE
                      </span>
                    )}
                    {c.current_status === "ESCALATED_HIGH_VALUE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                        <ShieldAlert className="w-3 h-3" /> HIGH VALUE ESCALATE
                      </span>
                    )}
                    {c.current_status === "ESCALATED_FAILED_REMEDIATION" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                        <AlertTriangle className="w-3 h-3" /> FAILED ACTION ESCALATE
                      </span>
                    )}
                  </td>

                  {/* Action Link */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/app/recovery/${c.case_id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                    >
                      Investigate <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCases.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No refunds found matching the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
