"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { RefundCase } from "@/types";

export default function AgentOperationsCenter() {
  const [limboCases, setLimboCases] = useState<RefundCase[]>([]);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLimbo = async () => {
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.success) {
        setLimboCases(data.data.cases.filter((c: RefundCase) => c.current_status === "LIMBO"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimbo();
  }, []);

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

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E7]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Agent Operations</h1>
          <p className="text-[14px] text-[#6E6E73] mt-1">
            Autonomous post-payment operations workers monitoring payment subsystem telemetry.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/app/agent/decisions"
            className="text-xs text-[#000000] font-medium hover:underline"
          >
            AI Decisions Ledger →
          </Link>
          <button
            onClick={handleRunNext}
            disabled={running || limboCases.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {running ? "Executing Loop..." : `Run Next Refund (${limboCases.length} queued)`}
          </button>
        </div>
      </div>

      {/* 7-Stage Visual Architecture Grid */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider">
          Closed-Loop Lifecycle Architecture
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 text-xs">
          {[
            { stage: "01 DETECT", desc: "Limbo queue ingestion" },
            { stage: "02 INVESTIGATE", desc: "5-subsystem telemetry" },
            { stage: "03 DIAGNOSE", desc: "Real Google Gemini" },
            { stage: "04 POLICY", desc: "10 deterministic rules" },
            { stage: "05 ACT", desc: "Bounded remediation" },
            { stage: "06 VERIFY", desc: "Independent state query" },
            { stage: "07 OUTCOME", desc: "Resolved or escalated" },
          ].map((s) => (
            <div
              key={s.stage}
              className="p-3 bg-[#F5F5F7] border border-[#E5E5E7] rounded-xl space-y-1"
            >
              <div className="font-mono font-bold text-[#000000] text-[11px]">{s.stage}</div>
              <div className="text-[10px] text-[#6E6E73]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Execution Trace */}
      {lastResult && (
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E7]">
            <h2 className="text-sm font-bold text-[#000000] tracking-tight">
              Latest Autonomous Run Trace: {lastResult.case_id}
            </h2>
            <Link
              href={`/app/recovery/${lastResult.case_id}`}
              className="text-xs text-[#000000] font-medium hover:underline"
            >
              View Case →
            </Link>
          </div>

          <div className="space-y-2">
            {lastResult.steps?.map((step: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E7] rounded-xl flex items-start gap-3 text-xs"
              >
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#E5E5E7] text-[#1D1D1F] text-[10px] shrink-0">
                  {step.step}
                </span>
                <span className="text-[#1D1D1F] leading-relaxed">{step.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
