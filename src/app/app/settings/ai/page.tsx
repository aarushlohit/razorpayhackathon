"use client";

import React, { useState } from "react";
import { Zap, CheckCircle2 } from "lucide-react";

export default function AISettingsPage() {
  const [model, setModel] = useState("gemini-2.5-flash");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">AI Diagnostic Engine</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure Yokai AI-compatible multi-provider fallback order and schema enforcement.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Primary Diagnosis Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="gemini-2.5-flash">Google Gemini 2.5/3 Flash (Recommended)</option>
            <option value="meta/llama-3.2-90b-vision-instruct">NVIDIA NIM (meta/llama-3.2-90b-vision-instruct)</option>
            <option value="mimo-v2.5-free">OpenCode Zen (mimo-v2.5-free)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Fallback Sequence</label>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
            <div>1. Google Gemini (`gemini-2.5-flash` / `gemini-3-flash`)</div>
            <div>2. OpenCode Zen (`mimo-v2.5-free`)</div>
            <div>3. NVIDIA NIM (`meta/llama-3.2-90b-vision-instruct`)</div>
            <div>4. Local Diagnostic Fallback (Explicitly labeled, zero external dependencies)</div>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Sampling Temperature</label>
          <input
            type="text"
            disabled
            value="0.2 (Optimized for deterministic structured diagnosis)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          {saved ? "Saved" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
