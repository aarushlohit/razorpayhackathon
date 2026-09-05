"use client";

import React from "react";
import { Users, UserPlus } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team & Permissions</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage workspace members and payment operations roles.
          </p>
        </div>
        <button className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-white">Aarush (Lead Ops)</div>
            <div className="text-[11px] text-slate-400 font-mono">demo@razorpay.com</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
            WORKSPACE ADMIN
          </span>
        </div>
      </div>
    </div>
  );
}
