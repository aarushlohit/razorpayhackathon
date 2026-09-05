"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AIDecisionsLedgerPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/decisions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDecisions(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <Link
          href="/app/agent"
          className="inline-flex items-center gap-1.5 text-xs text-[#6E6E73] hover:text-[#000000] transition mb-4 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Agent Center
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">AI Decisions Ledger</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Historical record of real external model diagnoses, latency, and deterministic policy gates.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E7] text-[#86868B] font-mono uppercase text-[11px]">
                <th className="pb-3 font-medium">Case ID</th>
                <th className="pb-3 font-medium">Diagnosis</th>
                <th className="pb-3 font-medium">Confidence</th>
                <th className="pb-3 font-medium">Recommended Action</th>
                <th className="pb-3 font-medium">Policy Result</th>
                <th className="pb-3 font-medium">Model</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B] font-mono">
                    Loading AI decisions...
                  </td>
                </tr>
              ) : decisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E6E73]">
                    No AI diagnostic decisions recorded yet. Run a case in the Agent Center or Recovery Queue.
                  </td>
                </tr>
              ) : (
                decisions.map((d) => (
                  <tr key={d.case_id} className="hover:bg-[#F5F5F7] transition">
                    <td className="py-3.5 font-mono font-semibold text-[#000000]">
                      <Link href={`/app/recovery/${d.case_id}`} className="hover:underline">
                        {d.case_id}
                      </Link>
                    </td>
                    <td className="py-3.5 uppercase font-mono font-medium text-[#1D1D1F]">
                      {d.diagnosis.likely_stage}
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-[#000000]">
                      {(d.diagnosis.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 font-mono text-[#6E6E73]">
                      {d.diagnosis.recommended_action}
                    </td>
                    <td className="py-3.5 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.policy?.allowed ? "bg-black text-white" : "bg-red-100 text-red-800"}`}>
                        {d.policy?.allowed ? "AUTHORIZED" : "HALTED"}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-[#6E6E73]">
                      {d.diagnosis.provider} {d.diagnosis.model ? `(${d.diagnosis.model})` : ""}
                    </td>
                    <td className="py-3.5 text-right font-mono text-[#1D1D1F] uppercase text-[11px] font-medium">
                      {d.status}
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
