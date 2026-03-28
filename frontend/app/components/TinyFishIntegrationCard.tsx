"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Zap, Shield, Activity, ExternalLink, Database } from "lucide-react";
import { getTinyFishIntegration } from "@/lib/api";
import type { TinyFishIntegrationResponse } from "@/lib/api";

/**
 * TinyFish Integration Summary card.
 * Shows the complete TinyFish API surface used by PriorAuth Pulse:
 * SSE events, Level 3 goal prompting, vault, proxy, agent memory, AgentOps.
 */
export default function TinyFishIntegrationCard() {
  const [data, setData] = useState<TinyFishIntegrationResponse | null>(null);

  useEffect(() => {
    getTinyFishIntegration().then((res) => {
      if (res) setData(res);
    });
  }, []);

  if (!data) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500/20 rounded-md flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-slate-300 text-sm font-semibold">TinyFish Integration</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
          {data.integration_level.split("—")[0].trim()}
        </span>
      </div>

      {/* Agent config */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Browser Profile", value: data.agent_configuration.browser_profile, color: "text-blue-400" },
          { label: "Vault Creds", value: `${data.vault_credential_ids.length} payers`, color: "text-violet-400" },
          { label: "US Proxy", value: data.agent_configuration.proxy_config.enabled ? "Enabled" : "Off", color: "text-teal-400" },
          { label: "Agent Memory", value: data.agent_configuration.feature_flags["enable_agent_memory"] ? "On" : "Off", color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-700/40 rounded-lg px-3 py-2">
            <p className="text-slate-500 text-xs mb-0.5">{label}</p>
            <p className={`text-xs font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* SSE events */}
      <div className="mb-4">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
          SSE Events Handled
        </p>
        <div className="space-y-1.5">
          {data.sse_events_handled.map(({ event, action }) => (
            <div key={event} className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-xs font-mono font-bold flex-shrink-0 mt-0.5">
                {event}
              </span>
              <span className="text-slate-400 text-xs leading-relaxed">{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Goal prompt features */}
      <div className="mb-4">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
          Level 3 Goal Prompt Features
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.goal_prompt_features.map((f) => (
            <span key={f} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-slate-400 text-xs">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Observability */}
      <div className="pt-3 border-t border-slate-700/50 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500 text-xs">streaming_url per run</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500 text-xs">AgentOps</span>
          {data.observability.agentops_integrated ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <span className="text-slate-600 text-xs">(key not set)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500 text-xs">Slack alerts</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        </div>
        {data.observability.agentops_session_url && (
          <a
            href={data.observability.agentops_session_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs transition-colors ml-auto"
          >
            Session Replay
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
