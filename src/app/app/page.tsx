"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RefundCase } from "@/types";
import { ArrowRight, RotateCcw } from "lucide-react";

interface OverviewMetrics {
  totalCases: number;
  limboCount: number;
  resolvedCount: number;
  escalatedCount: number;
  totalValueLimbo: number;
  totalValueResolved: number;
  medianInvestigationSeconds: number | null;
}

export default function OverviewPage() {
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCases(data.data.cases);
          setMetrics(data.data.metrics);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCases = cases.filter((c) => c.current_status === "LIMBO" || c.current_status === "INVESTIGATING").slice(0, 7);

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Top Greeting & Operational State */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">
          Good afternoon, Aarush.
        </h1>
        <p className="text-[14px] text-[#6E6E73]">
          Your recovery operations are active. Autonomous workers monitoring payment subsystem telemetry.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E7] p-5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider mb-2">
            Refunds requiring attention
          </div>
          <div className="text-3xl font-bold text-[#000000] tracking-tight">
            {loading ? "—" : metrics?.limboCount ?? 0}
          </div>
          <div className="text-[11px] text-[#6E6E73] mt-2 flex items-center gap-1">
            <span>₹{metrics?.totalValueLimbo.toLocaleString("en-IN") ?? 0}</span>
            <span>liability in limbo</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E7] p-5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider mb-2">
            Refunds Resolved
          </div>
          <div className="text-3xl font-bold text-[#000000] tracking-tight">
            {loading ? "—" : metrics?.resolvedCount ?? 0}
          </div>
          <div className="text-[11px] text-[#6E6E73] mt-2 flex items-center gap-1">
            <span>₹{(metrics?.totalValueResolved ?? 0).toLocaleString("en-IN")}</span>
            <span>liability resolved</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E7] p-5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider mb-2">
            Escalated to Ops
          </div>
          <div className="text-3xl font-bold text-[#000000] tracking-tight">
            {loading ? "—" : metrics?.escalatedCount ?? 0}
          </div>
          <div className="text-[11px] text-[#6E6E73] mt-2">
            Policy bounds enforced
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E7] p-5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-[#86868B] tracking-wider mb-2">
            Median Resolution
          </div>
          <div className="text-3xl font-bold text-[#000000] tracking-tight">
            {loading ? "—" : metrics?.medianInvestigationSeconds ? `${metrics.medianInvestigationSeconds}s` : "—"}
          </div>
          <div className="text-[11px] text-[#6E6E73] mt-2">
            From detection to closure
          </div>
        </div>
      </div>

      {/* Refunds Requiring Attention Table */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E7]">
          <div>
            <h2 className="text-base font-bold text-[#000000] tracking-tight">Refunds requiring attention</h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">Post-payment transactions requiring investigation or policy review</p>
          </div>
          <Link
            href="/app/recovery"
            className="inline-flex items-center gap-1.5 text-xs text-[#000000] font-medium hover:underline"
          >
            <span>View all ({cases.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E7] text-[11px] font-mono text-[#86868B] uppercase">
                <th className="py-2.5 font-medium">Case ID</th>
                <th className="py-2.5 font-medium">Merchant</th>
                <th className="py-2.5 font-medium">Amount</th>
                <th className="py-2.5 font-medium">Age</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium">Diagnosis</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#86868B] font-mono">
                    Loading operations queue...
                  </td>
                </tr>
              ) : pendingCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#6E6E73]">
                    No refunds currently in limbo. All post-payment operations are synchronized.
                  </td>
                </tr>
              ) : (
                pendingCases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-[#F5F5F7] transition">
                    <td className="py-3 font-mono font-semibold text-[#000000]">{c.case_id}</td>
                    <td className="py-3 text-[#1D1D1F] font-medium">{c.merchant_name}</td>
                    <td className="py-3 font-mono font-medium text-[#000000]">₹{c.amount.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-[#6E6E73] font-mono">{c.age_days}d</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F5F5F7] border border-[#E5E5E7] text-[#1D1D1F]">
                        {c.current_status}
                      </span>
                    </td>
                    <td className="py-3 text-[#6E6E73]">
                      {c.failure_class ? c.failure_class.replace(/_/g, " ") : "Pending AI"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/app/recovery/${c.case_id}`}
                        className="inline-flex items-center gap-1 text-[12px] px-3 py-1 bg-[#000000] text-white rounded-full font-medium hover:bg-[#1D1D1F] transition"
                      >
                        Investigate
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
