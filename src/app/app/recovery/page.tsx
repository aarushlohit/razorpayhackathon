"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RefundCase } from "@/types";

export default function RecoveryQueuePage() {
  const [cases, setCases] = useState<RefundCase[]>([]);
  const [filter, setFilter] = useState<"ALL" | "LIMBO" | "RESOLVED" | "ESCALATED">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filtered = cases.filter((c) => {
    if (filter === "LIMBO" && c.current_status !== "LIMBO" && c.current_status !== "INVESTIGATING") return false;
    if (filter === "RESOLVED" && c.current_status !== "RESOLVED") return false;
    if (filter === "ESCALATED" && !c.current_status.startsWith("ESCALATED")) return false;
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
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Recovery Queue</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Post-payment refunds requiring telemetry correlation, policy validation, and autonomous resolution.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E7]">
        <div className="flex items-center gap-6 text-[13px] font-medium">
          {(["ALL", "LIMBO", "RESOLVED", "ESCALATED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`transition pb-1 ${
                filter === tab
                  ? "text-[#000000] border-b-2 border-[#000000] font-semibold"
                  : "text-[#6E6E73] hover:text-[#000000]"
              }`}
            >
              {tab === "ALL" ? `All (${cases.length})` : tab === "LIMBO" ? "Needs Attention" : tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search refund, merchant, UTR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border border-[#E5E5E7] rounded-full px-4 py-1.5 text-xs text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] transition max-w-xs shadow-2xs"
        />
      </div>

      {/* Clean Monochrome Table */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E7] text-[#86868B] font-mono uppercase text-[11px]">
                <th className="pb-3 font-medium">Refund</th>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Age</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B] font-mono">
                    Loading recovery cases...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E6E73]">
                    No matching refund cases found in queue.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.case_id} className="hover:bg-[#F5F5F7] transition">
                    <td className="py-3.5 font-mono font-semibold text-[#000000]">
                      <div>{c.case_id}</div>
                      <div className="text-[10px] text-[#86868B] font-mono">{c.refund_id}</div>
                    </td>
                    <td className="py-3.5 font-medium text-[#1D1D1F]">{c.merchant_name}</td>
                    <td className="py-3.5 text-[#6E6E73]">
                      <div>{c.customer_name}</div>
                      <div className="text-[10px] font-mono text-[#86868B]">{c.customer_vpa_or_account}</div>
                    </td>
                    <td className="py-3.5 font-mono font-medium text-[#000000]">
                      ₹{c.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 font-mono text-[#6E6E73]">{c.age_days}d</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F5F5F7] border border-[#E5E5E7] text-[#1D1D1F]">
                        {c.current_status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/app/recovery/${c.case_id}`}
                        className="inline-flex items-center gap-1 text-[12px] px-3.5 py-1 bg-[#000000] text-white rounded-full font-medium hover:bg-[#1D1D1F] transition"
                      >
                        Investigate →
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
