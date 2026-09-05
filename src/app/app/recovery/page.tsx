"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RefundCase } from "@/types";
import { ChevronRight } from "lucide-react";

export default function RecoveryQueuePage() {
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ATTENTION" | "INVESTIGATING" | "RESOLVED">("ATTENTION");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.success) {
        setCases(data.data.cases || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filtered = cases.filter((c) => {
    if (filter === "ATTENTION" && c.current_status !== "LIMBO" && !c.current_status.startsWith("ESCALATED")) return false;
    if (filter === "INVESTIGATING" && c.current_status !== "INVESTIGATING" && c.current_status !== "ACTION_IN_PROGRESS") return false;
    if (filter === "RESOLVED" && c.current_status !== "RESOLVED") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.case_id.toLowerCase().includes(q) ||
        c.refund_id.toLowerCase().includes(q) ||
        c.merchant_name.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">
          Recovery Queue
        </h1>
        <p className="text-[14px] text-[#6E6E73]">
          The AI has prioritized {cases.length} refund cases across your connected payment systems.
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E7]">
        <div className="flex items-center gap-6 text-[13px]">
          {(["ATTENTION", "ALL", "INVESTIGATING", "RESOLVED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`transition pb-1 font-medium ${
                filter === tab
                  ? "text-[#000000] border-b-2 border-[#000000] font-semibold"
                  : "text-[#6E6E73] hover:text-[#000000]"
              }`}
            >
              {tab === "ATTENTION"
                ? "Needs attention"
                : tab === "ALL"
                ? `All (${cases.length})`
                : tab === "INVESTIGATING"
                ? "Investigating"
                : "Resolved"}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search refund, merchant, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border border-[#E5E5E7] rounded-full px-4 py-1.5 text-xs text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] transition max-w-xs shadow-2xs"
        />
      </div>

      {/* Minimal Editorial List View */}
      <div className="divide-y divide-[#E5E5E7] border-y border-[#E5E5E7]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#86868B] font-mono">
            Loading prioritized queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#86868B] font-mono">
            No refund cases matching this filter.
          </div>
        ) : (
          filtered.map((c) => {
            const diag = c.latest_diagnosis;
            const isResolved = c.current_status === "RESOLVED";
            const isEscalated = c.current_status.startsWith("ESCALATED");

            // Natural language AI summary line
            const summaryLine = diag?.assessment?.summary || diag?.reasoning || (
              c.failure_class === "WEBHOOK_MISSING"
                ? "Webhook delivery anomaly between gateway and merchant."
                : c.failure_class === "BANK_LEG_STUCK"
                ? "Downstream settlement leg stalled in NPCI clearing switch."
                : c.failure_class === "LEDGER_MISMATCH"
                ? "Discrepancy detected between gateway batch and merchant accounting ledger."
                : c.failure_class === "INVALID_DESTINATION"
                ? "Beneficiary account or VPA rejected by destination bank."
                : "Cross-system payment state inconsistency under correlation."
            );

            // Natural language action line
            const recommendedAction = diag?.assessment?.recommended_action?.action || diag?.recommended_action;
            const actionText = recommendedAction === "resend_webhook"
              ? "Retry webhook delivery"
              : recommendedAction === "refresh_status"
              ? "Refresh gateway status"
              : recommendedAction === "reconcile_state"
              ? "Reconcile internal ledger"
              : "Needs human review";

            return (
              <Link
                key={c.case_id}
                href={`/app/recovery/${c.case_id}`}
                className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-[#FBFBFC] transition px-3 rounded-xl -mx-3"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#000000]">
                      {c.case_id}
                    </span>
                    <span className="text-[#86868B]">·</span>
                    <span className="text-xs font-semibold text-[#1D1D1F]">
                      {c.merchant_name}
                    </span>
                  </div>

                  <p className="text-[13px] text-[#1D1D1F] leading-snug">
                    {summaryLine}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E73] font-mono pt-0.5">
                    {diag && (
                      <>
                        <span>{diag.confidence !== null && typeof diag.confidence === "number" ? `AI confidence ${(diag.confidence * 100).toFixed(0)}%` : "No AI diagnosis"}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>
                      Recommended: <strong className="text-[#1D1D1F]">{actionText}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 sm:self-center">
                  <div className="text-left sm:text-right font-mono">
                    <div className="text-sm font-semibold text-[#000000]">
                      ₹{c.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-[#86868B]">
                      {c.age_days} days
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-[#000000] group-hover:underline">
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
