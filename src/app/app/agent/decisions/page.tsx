"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DiagnosisResult, PolicyDecision } from "@/types";

interface DecisionRecord {
  case_id: string;
  refund_id: string;
  amount: number;
  currency: string;
  merchant_name: string;
  diagnosis: DiagnosisResult;
  policy?: PolicyDecision;
  status: string;
  updated_at?: string;
}

export default function AIDecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/decisions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDecisions(data.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalInvestigated = decisions.length;
  const totalResolved = decisions.filter((d) => d.status === "RESOLVED").length;
  const totalEscalated = decisions.filter((d) => d.status.startsWith("ESCALATED")).length;
  const totalBlocked = decisions.filter((d) => d.policy && !d.policy.allowed).length;

  return (
    <div className="space-y-10 max-w-4xl pb-20">
      {/* Header */}
      <div className="space-y-1 border-b border-[#E5E5E7] pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">
          AI Decisions
        </h1>
        <p className="text-[14px] text-[#6E6E73]">
          The operator has investigated {totalInvestigated} cases across connected payment rails.
        </p>
      </div>

      {/* Summary Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-2 border-b border-[#E5E5E7] pb-8 font-mono">
        <div>
          <div className="text-[11px] text-[#86868B] uppercase">Investigated</div>
          <div className="text-3xl font-bold text-[#000000] mt-1">{totalInvestigated}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#86868B] uppercase">Resolved</div>
          <div className="text-3xl font-bold text-[#000000] mt-1">{totalResolved}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#86868B] uppercase">Escalated</div>
          <div className="text-3xl font-bold text-[#000000] mt-1">{totalEscalated}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#86868B] uppercase">Paused / Blocked</div>
          <div className="text-3xl font-bold text-[#000000] mt-1">{totalBlocked}</div>
        </div>
      </div>

      {/* Natural Language Decision Feed */}
      <div className="space-y-6">
        <div className="text-[11px] font-mono tracking-widest text-[#86868B] uppercase">
          CHRONOLOGICAL OPERATIONS TIMELINE
        </div>

        <div className="divide-y divide-[#E5E5E7] border-y border-[#E5E5E7]">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#86868B] font-mono">
              Loading decisions timeline...
            </div>
          ) : decisions.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#86868B] font-mono">
              No decisions recorded yet. Run an investigation from the Recovery Queue.
            </div>
          ) : (
            decisions.map((d) => {
              const diag = d.diagnosis;
              const assessment = diag.assessment;
              const isResolved = d.status === "RESOLVED";
              const timeString = d.updated_at ? new Date(d.updated_at).toLocaleTimeString() : "Recent";

              return (
                <div key={d.case_id} className="py-6 space-y-4">
                  {/* Step 1: Investigation */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#86868B]">
                        <span>{timeString}</span>
                        <span>·</span>
                        <span className="font-semibold text-[#000000]">{d.case_id}</span>
                        <span>·</span>
                        <span>{d.merchant_name}</span>
                      </div>
                      <p className="text-[14px] text-[#1D1D1F] font-medium leading-relaxed">
                        AI investigated {d.merchant_name} (₹{d.amount.toLocaleString("en-IN")})
                      </p>
                      <p className="text-xs text-[#6E6E73] leading-relaxed">
                        {assessment?.summary || diag.reasoning}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[#6E6E73] font-mono pt-0.5">
                        <span>{(diag.confidence * 100).toFixed(0)}% confidence</span>
                        <span>·</span>
                        <span className="capitalize">{diag.provider}</span>
                        {diag.latency_ms && (
                          <>
                            <span>·</span>
                            <span>{diag.latency_ms}ms</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-semibold text-[#000000] shrink-0">
                      ₹{d.amount.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Step 2: Policy & Action */}
                  {d.policy && (
                    <div className="pl-4 border-l-2 border-[#000000] space-y-1 text-xs">
                      <div className="font-mono text-[11px] text-[#86868B]">
                        {d.policy.allowed ? "Safety authorization granted" : "Safety policy triggered"}
                      </div>
                      <div className="text-[#1D1D1F]">
                        {d.policy.allowed ? (
                          <>
                            Action: <strong className="font-mono">{d.policy.action_to_take}</strong>
                          </>
                        ) : (
                          d.policy.reason
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Verification & Outcome */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${isResolved ? "bg-[#34C759]" : "bg-[#86868B]"}`} />
                      <span className="font-mono font-semibold text-[#000000]">
                        {isResolved ? "Verified · Resolved" : d.status}
                      </span>
                    </div>

                    <Link
                      href={`/app/recovery/${d.case_id}`}
                      className="text-xs font-semibold text-[#000000] hover:underline inline-flex items-center gap-1"
                    >
                      Inspect investigation <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
