"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { getRecentChecks } from "@/lib/api";
import type { PACheck, PAStatus } from "@/lib/api";

const STATUS_STYLES: Record<PAStatus, { color: string; dot: string }> = {
  Approved:          { color: "text-emerald-400", dot: "bg-emerald-400" },
  Denied:            { color: "text-red-400",     dot: "bg-red-400" },
  Pending:           { color: "text-amber-400",   dot: "bg-amber-400" },
  "Info Needed":     { color: "text-orange-400",  dot: "bg-orange-400" },
  "In Review":       { color: "text-blue-400",    dot: "bg-blue-400" },
  Expired:           { color: "text-slate-400",   dot: "bg-slate-400" },
  "Not Found":       { color: "text-slate-500",   dot: "bg-slate-500" },
  "Portal Unavailable": { color: "text-slate-600", dot: "bg-slate-600" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * TinyFish Live Runs card.
 * Shows recent PA checks with their TinyFish run_id and streaming_url,
 * demonstrating SSE event capture and real-time observability.
 */
export default function TinyFishRunsCard() {
  const [checks, setChecks] = useState<PACheck[]>([]);

  useEffect(() => {
    getRecentChecks(10).then((res) => {
      if (res) setChecks(res.checks.slice(0, 8));
    });
  }, []);

  if (checks.length === 0) return null;

  const liveCount = checks.filter((c) => c.streaming_url).length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-slate-300 text-sm font-semibold">TinyFish Agent Runs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
          </span>
          <span className="text-blue-400 text-xs">{liveCount > 0 ? `${liveCount} live` : "SSE streaming"}</span>
        </div>
      </div>

      {/* Cost badge */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-slate-400 text-xs">
          <span className="text-blue-300 font-semibold">$0.04/operation</span>
          {" "}· residential proxy included · anti-bot included · no hidden costs
        </span>
      </div>

      {/* Run list */}
      <div className="space-y-2">
        {checks.map((check, i) => {
          const style = STATUS_STYLES[check.auth_status] ?? STATUS_STYLES["Pending"];
          return (
            <div
              key={`${check.member_id}-${check.payer_name}-${i}`}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
            >
              {/* Status dot */}
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />

              {/* Patient + payer */}
              <div className="flex-1 min-w-0">
                <span className="text-slate-200 text-xs font-medium truncate block">
                  {check.patient_name}
                </span>
                <span className="text-slate-500 text-xs">{check.payer_name}</span>
              </div>

              {/* Status */}
              <span className={`text-xs font-semibold flex-shrink-0 ${style.color}`}>
                {check.auth_status}
              </span>

              {/* run_id */}
              {check.run_id && (
                <span className="text-slate-600 text-xs font-mono truncate max-w-[60px] hidden sm:block">
                  {check.run_id.slice(-8)}
                </span>
              )}

              {/* Time */}
              <span className="text-slate-600 text-xs flex-shrink-0 hidden sm:block">
                {timeAgo(check.checked_at)}
              </span>

              {/* Streaming URL link */}
              {check.streaming_url ? (
                <a
                  href={check.streaming_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                  title="Watch live browser replay"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="w-3.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-600 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            2m 14s avg · 50 portals
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            98.7% success rate
          </span>
        </div>
        <a
          href="https://tinyfish.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 hover:text-slate-400 text-xs transition-colors flex items-center gap-1"
        >
          tinyfish.ai
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
}
