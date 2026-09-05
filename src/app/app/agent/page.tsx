"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ArrowRight, ChevronRight, Check, Loader2 } from "lucide-react";
import { RefundCase } from "@/types";

export default function AgentOperationsCenter() {
  const [limboCases, setLimboCases] = useState<RefundCase[]>([]);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; resolvedValue: number } | null>(null);

  const fetchLimbo = async () => {
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.success) {
        setLimboCases((data.data.cases || []).filter((c: RefundCase) => c.current_status === "LIMBO"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimbo();
  }, []);

  const handleRunBatch = async () => {
    if (limboCases.length === 0 || batchRunning) return;
    setBatchRunning(true);
    setBatchProgress({ total: Math.min(limboCases.length, 5), done: 0, resolvedValue: 0 });
    try {
      const res = await fetch("/api/agent/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchProgress({
          total: data.data.processed,
          done: data.data.processed,
          resolvedValue: data.data.totalResolved,
        });
        await fetchLimbo();
      }
    } finally {
      setBatchRunning(false);
    }
  };

  const handleRunNext = async () => {
    if (limboCases.length === 0) return;
    setRunning(true);
    try {
      const res = await fetch("/api/agent/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: limboCases[0].case_id }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data.data);
        await fetchLimbo();
      }
    } finally {
      setRunning(false);
    }
  };

  const activeCase = limboCases[0];

  return (
    <div className="space-y-10 max-w-4xl pb-20">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E5E5E7] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-[#000000]">
              Refund Loop Agent
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#EBFDF0] border border-[#BBF7D0] text-[#166534] text-[10px] font-mono font-bold tracking-wider">
              ONLINE
            </span>
          </div>
          <p className="text-[14px] text-[#6E6E73]">
            Monitoring refund operations across your connected payment systems.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunBatch}
            disabled={batchRunning || running || limboCases.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-xs"
          >
            {batchRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running batch loop...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run batch loop ({Math.min(limboCases.length, 5)})</span>
              </>
            )}
          </button>

          <button
            onClick={handleRunNext}
            disabled={running || batchRunning || limboCases.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] text-xs font-medium rounded-full hover:bg-[#E5E5E7] transition disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Investigating...</span>
              </>
            ) : (
              <span>Next single case</span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Batch Progress Notification ──────────────────────────────── */}
      {batchProgress && (
        <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs space-y-1">
          <div className="font-semibold text-[#166534] flex items-center gap-2">
            <Check className="w-4 h-4" />
            Batch Autonomous Investigation Complete
          </div>
          <p className="text-[#14532D]">
            Processed {batchProgress.total} cases across multi-agent payment validation rails.
            {batchProgress.resolvedValue > 0 && (
              <span> Recovered ₹{batchProgress.resolvedValue.toLocaleString("en-IN")} in settled merchant capital.</span>
            )}
          </p>
        </div>
      )}

      {/* ─── Currently Prioritized / Investigating ───────────────────────── */}
      <div className="space-y-4">
        <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
          CURRENTLY INVESTIGATING
        </div>

        {activeCase ? (
          <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E5E5E7] pb-4">
              <div>
                <div className="font-mono text-sm font-bold text-[#000000]">
                  {activeCase.case_id} · {activeCase.merchant_name}
                </div>
                <div className="text-xs text-[#6E6E73] mt-0.5">
                  {activeCase.failure_class.replace(/_/g, " ")} · {activeCase.age_days} days in limbo
                </div>
              </div>

              <div className="font-mono text-sm font-semibold text-[#000000]">
                ₹{activeCase.amount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Evidence Gathering Pipeline */}
            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-mono uppercase text-[#86868B]">Subsystem Evidence Correlation</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-white border border-[#E5E5E7] rounded-xl flex items-center justify-between">
                  <span>Gateway</span>
                  <Check className="w-3.5 h-3.5 text-[#34C759]" />
                </div>
                <div className="p-3 bg-white border border-[#E5E5E7] rounded-xl flex items-center justify-between">
                  <span>Settlement</span>
                  <Check className="w-3.5 h-3.5 text-[#34C759]" />
                </div>
                <div className="p-3 bg-white border border-[#E5E5E7] rounded-xl flex items-center justify-between">
                  <span>Webhook</span>
                  {running ? (
                    <span className="w-2 h-2 rounded-full bg-[#FF9500] animate-pulse" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-[#34C759]" />
                  )}
                </div>
                <div className="p-3 bg-white border border-[#E5E5E7] rounded-xl flex items-center justify-between">
                  <span>Destination</span>
                  <Check className="w-3.5 h-3.5 text-[#34C759]" />
                </div>
                <div className="p-3 bg-white border border-[#E5E5E7] rounded-xl flex items-center justify-between">
                  <span>Ledger</span>
                  <Check className="w-3.5 h-3.5 text-[#34C759]" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Link
                href={`/app/recovery/${activeCase.case_id}`}
                className="text-xs font-semibold text-[#000000] hover:underline inline-flex items-center gap-1"
              >
                Inspect full investigation <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[#86868B] font-mono">
            No refund cases currently stuck in limbo. All systems synchronized.
          </div>
        )}
      </div>

      {/* ─── Recent Work & Verified Outcomes ─────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-[#E5E5E7]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
            RECENT WORK
          </div>
          <Link
            href="/app/agent/decisions"
            className="text-xs font-semibold text-[#000000] hover:underline"
          >
            Decisions ledger →
          </Link>
        </div>

        {lastResult ? (
          <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${lastResult.final_status === "RESOLVED" ? "bg-[#34C759]" : "bg-[#FF9500]"}`} />
                <span className="font-mono font-bold text-[#000000]">
                  {lastResult.case_id} · {lastResult.final_status}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#86868B]">Just now</span>
            </div>

            <p className="text-[13px] text-[#1D1D1F] leading-relaxed">
              {lastResult.updated_case?.latest_diagnosis?.assessment?.summary ||
                lastResult.updated_case?.latest_diagnosis?.reasoning ||
                "Investigation completed."}
            </p>

            <div className="pt-1">
              <Link
                href={`/app/recovery/${lastResult.case_id}`}
                className="font-semibold text-[#000000] hover:underline inline-flex items-center gap-1 text-xs"
              >
                Review case details <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#6E6E73] leading-relaxed">
            Click &quot;Investigate next refund&quot; to trigger the autonomous investigation sequence on queued cases.
          </div>
        )}
      </div>
    </div>
  );
}
