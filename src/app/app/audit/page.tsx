"use client";

import React, { useEffect, useState } from "react";
import { AuditLogEntry } from "@/types";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AuditLedgerPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [integrity, setIntegrity] = useState<{ valid: boolean; count: number; error?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setIntegrity(data.data.integrity || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VERIFY_INTEGRITY" }),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrity({
          valid: data.data.status === "AUDIT_INTEGRITY_VALID",
          count: data.data.count,
          error: data.data.error,
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header & Verification Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E7]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Audit Ledger</h1>
          <p className="text-[14px] text-[#6E6E73] mt-1">
            Append-only cryptographic SHA-256 hash chain recording every autonomous event, decision, and verification.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {integrity && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${integrity.valid ? "bg-emerald-600" : "bg-rose-600"}`} />
              <span className="text-[#000000] font-semibold">
                {integrity.valid ? `AUDIT INTEGRITY: VALID (${integrity.count} events)` : "AUDIT INTEGRITY: COMPROMISED"}
              </span>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#000000] text-white text-xs font-medium rounded-full hover:bg-[#1D1D1F] transition disabled:opacity-50 shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {verifying ? "Recomputing Chain..." : "Verify Audit Integrity"}
          </button>
        </div>
      </div>

      {/* Audit Event Table */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E7] text-[#86868B] font-mono uppercase text-[11px]">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Stage</th>
                <th className="pb-3 font-medium">Case ID</th>
                <th className="pb-3 font-medium">Actor</th>
                <th className="pb-3 font-medium">Message & Telemetry Details</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86868B] font-mono">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6E6E73]">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F5F7] transition">
                    <td className="py-3.5 font-mono text-[#86868B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-[#000000]">
                      {log.stage}
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-[#000000]">
                      {log.case_id}
                    </td>
                    <td className="py-3.5 text-[#6E6E73] font-mono">
                      {log.actor}
                    </td>
                    <td className="py-3.5 text-[#1D1D1F] leading-relaxed max-w-md">
                      <div>{log.message}</div>
                      {log.event_hash && (
                        <div className="text-[10px] font-mono text-[#86868B] truncate mt-0.5">
                          hash: {log.event_hash.slice(0, 16)}...
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F5F5F7] border border-[#E5E5E7] text-[#1D1D1F]">
                        {log.status}
                      </span>
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
