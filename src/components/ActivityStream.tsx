"use client";

import React, { useRef, useEffect } from "react";
import { AuditLogEntry } from "@/types";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Zap,
  Play,
  RotateCcw,
} from "lucide-react";

interface ActivityStreamProps {
  logs: AuditLogEntry[];
  isStreaming: boolean;
  onClear?: () => void;
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ logs, isStreaming }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getStageBadge = (stage: AuditLogEntry["stage"], status: AuditLogEntry["status"]) => {
    switch (stage) {
      case "DETECT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">DETECT</span>;
      case "INVESTIGATE":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40">INVESTIGATE</span>;
      case "DIAGNOSE":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/40">DIAGNOSE</span>;
      case "POLICY_GATE":
        return status === "SUCCESS" ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">POLICY ALLOWED</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/40">POLICY GATE</span>
        );
      case "ACT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/40">MOCK ACT</span>;
      case "VERIFY":
        return status === "SUCCESS" ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">VERIFY OK</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/40">VERIFY FAILED</span>
        );
      case "OUTCOME":
        return status === "SUCCESS" ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">RESOLVED</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">ESCALATED</span>
        );
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">{stage}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isStreaming ? "text-blue-400 animate-pulse" : "text-slate-400"}`} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Live Agent Loop Stream
          </h2>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Agent Active
          </span>
        )}
      </div>

      {/* Log Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono text-xs max-h-[600px]">
        {logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center text-xs">
            <Zap className="w-6 h-6 mb-2 text-slate-600" />
            <span>Click &ldquo;RUN AGENT&rdquo; or &ldquo;Step Next Case&rdquo; to begin closed-loop execution.</span>
          </div>
        ) : (
          logs.slice(0, 50).map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition text-slate-300 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{time}</span>
                    {getStageBadge(log.stage, log.status)}
                    {log.case_id !== "SYSTEM" && (
                      <span className="text-[11px] font-semibold text-slate-200">
                        {log.case_id}
                      </span>
                    )}
                  </div>
                  {log.status === "SUCCESS" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {log.status === "WARNING" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {log.status === "FAILURE" && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <div className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {log.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
