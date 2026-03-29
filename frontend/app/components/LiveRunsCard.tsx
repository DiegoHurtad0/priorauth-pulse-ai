"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { getLiveRuns } from "@/lib/api";
import type { LiveRun } from "@/lib/api";

export default function LiveRunsCard() {
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getLiveRuns(12);
    if (res) {
      setRuns(res.runs);
      setTotal(res.total_real_runs);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!loading && runs.length === 0) return null;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          <span className="text-white font-semibold text-sm">Real TinyFish Agent Runs</span>
          <span className="bg-blue-500/15 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {total} total
          </span>
        </div>
        <button
          onClick={load}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Runs list */}
      <div className="divide-y divide-slate-700/50">
        {loading ? (
          <div className="px-5 py-6 text-center text-slate-500 text-sm">Loading…</div>
        ) : (
          runs.map((run) => (
            <div key={run.run_id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-200 text-xs font-semibold truncate max-w-[160px]">
                    {run.payer_name}
                  </span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-slate-400 text-xs truncate max-w-[120px]">{run.patient_name}</span>
                  {run.steps_executed != null && (
                    <>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-amber-400 text-xs font-medium flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {run.steps_executed} steps
                      </span>
                    </>
                  )}
                </div>
                <p className="text-slate-600 text-xs font-mono mt-0.5 truncate">
                  {run.run_id}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {run.streaming_url && (
                  <a
                    href={run.streaming_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                    </span>
                    Replay
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="text-slate-600 text-xs">
                  {run.checked_at ? new Date(run.checked_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-900/30">
        <p className="text-slate-500 text-xs">
          Each row = a real TinyFish browser agent with a unique UUID run_id. Click{" "}
          <span className="text-red-400">Replay</span> to watch the browser session recording.
        </p>
      </div>
    </div>
  );
}
