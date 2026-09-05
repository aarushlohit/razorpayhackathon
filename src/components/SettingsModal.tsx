"use client";

import React, { useState } from "react";
import { X, Sliders, Shield, Key, Save, Check } from "lucide-react";
import { SimulatorConfig } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  config: SimulatorConfig;
  onClose: () => void;
  onSaveConfig: (updated: Partial<SimulatorConfig>, apiKeyOverride?: { provider: string; apiKey: string }) => void;
  activeProvider: string;
  userApiKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
  activeProvider: initialProvider,
  userApiKey: initialApiKey,
}) => {
  const [confidenceCutoff, setConfidenceCutoff] = useState(config.confidence_threshold * 100);
  const [highValueLimit, setHighValueLimit] = useState(config.high_value_limit ?? config.high_value_threshold ?? 50000);
  const [provider, setProvider] = useState(initialProvider || "gemini");
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(
      {
        confidence_threshold: confidenceCutoff / 100,
        high_value_threshold: Number(highValueLimit),
      },
      apiKey.trim() ? { provider, apiKey: apiKey.trim() } : undefined
    );
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">Safety Policy & AI Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Policy Gate 1: Confidence Cutoff */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Rule 1: Autonomous Confidence Gate
              </label>
              <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                {confidenceCutoff}%
              </span>
            </div>
            <input
              type="range"
              min="65"
              max="95"
              step="1"
              value={confidenceCutoff}
              onChange={(e) => setConfidenceCutoff(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If AI diagnosis certainty is below {confidenceCutoff}%, autonomous action is strictly blocked and escalated to Human Ops.
            </p>
          </div>

          {/* Policy Gate 2: High Value Threshold */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Rule 2: High-Value Autonomous Limit
              </label>
              <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                ₹{highValueLimit.toLocaleString("en-IN")}
              </span>
            </div>
            <select
              value={highValueLimit}
              onChange={(e) => setHighValueLimit(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="25000">₹25,000 (Conservative)</option>
              <option value="50000">₹50,000 (Standard Recommended)</option>
              <option value="100000">₹1,00,000 (High Volume)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Refunds exceeding ₹{highValueLimit.toLocaleString("en-IN")} mandate human dual-signoff.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <h4 className="text-slate-200 font-bold mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Multi-Provider AI Fallback Engine
            </h4>

            <div className="space-y-2.5">
              <div>
                <label className="text-slate-400 block mb-1">Select AI Provider / Model</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="gemini">Google Gemini 3 Flash / 2.0 Flash (Recommended)</option>
                  <option value="nvidia">NVIDIA NIM (meta/llama-3.2-11b)</option>
                  <option value="opencode">OpenCode Zen (mimo-v2.5-free)</option>
                  <option value="heuristic">Heuristic Fallback Engine (Offline)</option>
                </select>
              </div>

              {provider !== "heuristic" && (
                <div>
                  <label className="text-slate-400 block mb-1">
                    API Key <span className="text-slate-500">(Optional - will use server env if left blank)</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key (AI Studio / NIM / Zen)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-950/50 p-2 rounded border border-slate-800/60">
                ⚡ Resilient Architecture: Equipped with a JSON Auto-Healer and zero-downtime offline fallback engine. The application operates reliably under all network conditions.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
