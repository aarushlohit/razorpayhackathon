"use client";

import React, { useState, useMemo } from "react";
import { RefundCase, CaseStatus } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Play,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface LiveQueueTableProps {
  cases: RefundCase[];
  selectedCaseId?: string;
  onSelectCase: (c: RefundCase) => void;
  onRunSingle: (caseId: string) => void;
  isProcessing: boolean;
}

export const LiveQueueTable: React.FC<LiveQueueTableProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onRunSingle,
  isProcessing,
}) => {
  const [filter, setFilter] = useState<"ALL" | "LIMBO" | "RESOLVED" | "ESCALATED" | "PLANTED">("ALL");
  const [search, setSearch] = useState("");

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Filter tab
      if (filter === "LIMBO" && c.current_status !== "LIMBO") return false;
      if (filter === "RESOLVED" && c.current_status !== "RESOLVED") return false;
      if (
        filter === "ESCALATED" &&
        !c.current_status.startsWith("ESCALATED")
      )
        return false;
      if (filter === "PLANTED" && !c.is_planted_failure) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.case_id.toLowerCase().includes(q) ||
          c.refund_id.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q) ||
          c.merchant_name.toLowerCase().includes(q) ||
          c.failure_class.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cases, filter, search]);

  const renderStatusBadge = (status: CaseStatus, isPlanted: boolean) => {
    switch (status) {
      case "LIMBO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Limbo
          </span>
        );
      case "INVESTIGATING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Zap className="w-3 h-3" /> Investigating
          </span>
        );
      case "ACTION_IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Play className="w-3 h-3" /> Acting
          </span>
        );
      case "VERIFYING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            Verifying...
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case "ESCALATED_LOW_CONFIDENCE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <HelpCircle className="w-3 h-3" /> Low Conf Escalate
          </span>
        );
      case "ESCALATED_HIGH_VALUE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldAlert className="w-3 h-3" /> High Value Escalate
          </span>
        );
      case "ESCALATED_FAILED_REMEDIATION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" /> Failed Action Escalate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/40 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const renderConfidenceBadge = (confidence?: number | null) => {
    if (confidence === undefined || confidence === null) return <span className="text-slate-600 font-mono text-xs">-</span>;
    const pct = Math.round(confidence * 100);
    const colorClass =
      pct >= 85
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        : pct >= 70
        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20";

    return (
      <div className="flex items-center gap-1.5">
        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono px-1 rounded border ${colorClass}`}>
          {pct}%
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/40">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(["ALL", "LIMBO", "RESOLVED", "ESCALATED", "PLANTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filter === tab
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "PLANTED" ? "Planted Failures" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search case, merchant, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 sm:w-64 font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 min-h-[450px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/80 sticky top-0 text-slate-400 font-mono text-[11px] border-b border-slate-800 z-10">
            <tr>
              <th className="py-2.5 px-3 font-semibold">CASE / REFUND</th>
              <th className="py-2.5 px-3 font-semibold">MERCHANT & USER</th>
              <th className="py-2.5 px-3 font-semibold text-right">AMOUNT (₹)</th>
              <th className="py-2.5 px-3 font-semibold">AGE</th>
              <th className="py-2.5 px-3 font-semibold">DIAGNOSIS</th>
              <th className="py-2.5 px-3 font-semibold">CONFIDENCE</th>
              <th className="py-2.5 px-3 font-semibold">POLICY GATE</th>
              <th className="py-2.5 px-3 font-semibold">STATUS</th>
              <th className="py-2.5 px-3 font-semibold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredCases.map((c) => {
              const isSelected = selectedCaseId === c.case_id;
              const policyAllowed = c.latest_policy?.allowed;

              return (
                <tr
                  key={c.case_id}
                  onClick={() => onSelectCase(c)}
                  className={`cursor-pointer transition hover:bg-slate-800/40 ${
                    isSelected ? "bg-blue-950/30 border-l-2 border-blue-500" : ""
                  }`}
                >
                  {/* Case / Refund */}
                  <td className="py-2.5 px-3 font-mono">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      {c.case_id}
                      {c.is_planted_failure && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-900/40 text-rose-300 border border-rose-700/50" title="Planted Failure Test Case">
                          PLANTED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{c.refund_id}</div>
                  </td>

                  {/* Merchant & Customer */}
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-200 truncate max-w-[140px]">{c.merchant_name}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.customer_name}</div>
                  </td>

                  {/* Amount */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    <div className={`font-semibold ${c.amount > 50000 ? "text-purple-300" : "text-slate-100"}`}>
                      ₹{c.amount.toLocaleString("en-IN")}
                    </div>
                    {c.amount > 50000 && (
                      <span className="text-[9px] text-purple-400 font-normal">High Value</span>
                    )}
                  </td>

                  {/* Age */}
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {c.age_days}d
                  </td>

                  {/* Diagnosis */}
                  <td className="py-2.5 px-3">
                    {c.latest_diagnosis && c.latest_diagnosis.likely_stage ? (
                      <div className="text-slate-200 font-medium capitalize">
                        {c.latest_diagnosis.likely_stage.replace(/_/g, " ")}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">{c.latest_diagnosis?.provider === "AI_UNAVAILABLE" ? "AI Unavailable" : "Unanalyzed"}</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="py-2.5 px-3">
                    {renderConfidenceBadge(c.latest_diagnosis?.confidence)}
                  </td>

                  {/* Policy Gate */}
                  <td className="py-2.5 px-3">
                    {c.latest_policy ? (
                      policyAllowed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <ShieldCheck className="w-3 h-3" /> Auto-Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400" title={c.latest_policy.reason}>
                          <ShieldAlert className="w-3 h-3" /> Gate Blocked
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3">
                    {renderStatusBadge(c.current_status, c.is_planted_failure)}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {c.current_status === "LIMBO" ? (
                        <button
                          onClick={() => onRunSingle(c.case_id)}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-50"
                          title="Run Agent Loop on this case"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Unstick
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectCase(c)}
                          className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded hover:bg-slate-700 transition"
                          title="Inspect case audit trail"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredCases.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No refund cases match the active filter or search query.
          </div>
        )}
      </div>
    </div>
  );
};
