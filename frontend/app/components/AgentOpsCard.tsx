"use client";

import { useEffect, useState } from "react";
import { Activity, Zap, Clock, TrendingUp } from "lucide-react";
import { getAgentOpsMetrics } from "@/lib/api";
import type { AgentOpsMetrics } from "@/lib/api";

/**
 * AgentOps monitoring metrics card.
 * Shows total runs, success rate, avg duration, and per-payer breakdown.
 * Data comes from /agentops/metrics (realistic demo numbers).
 */
export default function AgentOpsCard() {
  const [metrics, setMetrics] = useState<AgentOpsMetrics | null>(null);

  useEffect(() => {
    getAgentOpsMetrics().then((m) => {
      if (m) setMetrics(m);
    });
  }, []);

  if (!metrics) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-500/20 rounded-md flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-slate-300 text-sm font-semibold">AgentOps Monitoring</span>
        </div>
        <a
          href="https://agentops.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 text-xs transition-colors"
        >
          agentops.ai →
        </a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-700/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-slate-500 text-xs">Total Runs</span>
          </div>
          <span className="text-white text-xl font-bold tabular-nums">
            {metrics.total_runs.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-700/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-500 text-xs">Success Rate</span>
          </div>
          <span className="text-emerald-400 text-xl font-bold tabular-nums">
            {metrics.success_rate}%
          </span>
        </div>

        <div className="bg-slate-700/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-slate-500 text-xs">Avg Duration</span>
          </div>
          <span className="text-blue-400 text-xl font-bold tabular-nums">
            {metrics.avg_duration_seconds}s
          </span>
        </div>

        <div className="bg-slate-700/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-amber-400" />
            <span className="text-slate-500 text-xs">Last 24h</span>
          </div>
          <span className="text-amber-400 text-xl font-bold tabular-nums">
            {metrics.last_24h_runs}
          </span>
          <span className="text-slate-500 text-xs ml-1">runs</span>
        </div>
      </div>

      {/* Per-payer bar chart */}
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
          Payer Performance
        </p>
        <div className="space-y-2">
          {metrics.top_payers.map((payer) => (
            <div key={payer.name} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-32 flex-shrink-0 truncate">
                {payer.name}
              </span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${payer.success_rate}%` }}
                />
              </div>
              <span className="text-slate-400 text-xs tabular-nums w-12 text-right flex-shrink-0">
                {payer.success_rate}%
              </span>
              <span className="text-slate-600 text-xs tabular-nums w-14 text-right flex-shrink-0">
                {payer.runs} runs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
