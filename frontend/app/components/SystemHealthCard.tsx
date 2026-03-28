"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Bot,
  Cpu,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Subsystem {
  status: string;
  [key: string]: unknown;
}

interface HealthData {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  demo_mode: boolean;
  active_tasks: number;
  subsystems: {
    mongodb: Subsystem & { latency_ms: number | null; active_patients: number; total_checks: number };
    scheduler: Subsystem & { interval: string; running: boolean };
    tinyfish_agent: Subsystem & { mode: string; supported_payers: number };
    claude_ai: Subsystem & { model: string; thinking: string };
    notifications: Subsystem & { slack: string };
  };
}

function StatusDot({ status }: { status: string }) {
  if (status === "ok" || status === "configured") {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  }
  if (status === "demo_mode") {
    return <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  }
  if (status === "stopped" || status === "not_set") {
    return <AlertCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
  }
  return <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/**
 * System health card — calls /health/detailed and renders subsystem statuses.
 * Demonstrates operational maturity: MongoDB, TinyFish, Claude, Scheduler.
 */
export default function SystemHealthCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${BASE_URL}/health/detailed`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setLastFetch(new Date());
      }
    } catch {
      // Silently fail — health card is non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 bg-slate-700 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!health) return null;

  const overall = health.status === "ok";
  const s = health.subsystems;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              overall ? "bg-emerald-500/20" : "bg-amber-500/20"
            }`}
          >
            <Cpu
              className={`w-3.5 h-3.5 ${overall ? "text-emerald-400" : "text-amber-400"}`}
            />
          </div>
          <span className="text-slate-300 text-sm font-semibold">System Health</span>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-slate-600 text-xs hidden sm:block">
              {timeAgo(lastFetch.toISOString())}
            </span>
          )}
          <button
            onClick={fetchHealth}
            className="text-slate-600 hover:text-slate-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={`${BASE_URL}/health/detailed`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-400 transition-colors"
            title="View raw JSON"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Overall status banner */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${
          overall
            ? "bg-emerald-500/5 border border-emerald-500/15"
            : "bg-amber-500/5 border border-amber-500/15"
        }`}
      >
        <StatusDot status={health.status} />
        <span
          className={`text-xs font-semibold ${overall ? "text-emerald-400" : "text-amber-400"}`}
        >
          {overall ? "All systems operational" : "Degraded — check subsystems"}
        </span>
        <span className="text-slate-600 text-xs ml-auto">v{health.version}</span>
      </div>

      {/* Subsystem rows */}
      <div className="space-y-2.5">
        {/* MongoDB */}
        <div className="flex items-center gap-2.5">
          <StatusDot status={s.mongodb.status} />
          <Database className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-slate-400 text-xs flex-1">MongoDB Atlas</span>
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            {s.mongodb.latency_ms !== null && (
              <span className="text-slate-500">{s.mongodb.latency_ms}ms</span>
            )}
            <span>{s.mongodb.active_patients} patients</span>
            <span className="hidden sm:inline">· {s.mongodb.total_checks} checks</span>
          </div>
        </div>

        {/* Scheduler */}
        <div className="flex items-center gap-2.5">
          <StatusDot status={s.scheduler.status} />
          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-slate-400 text-xs flex-1">APScheduler</span>
          <span className="text-slate-600 text-xs">{s.scheduler.interval}</span>
        </div>

        {/* TinyFish */}
        <div className="flex items-center gap-2.5">
          <StatusDot status={s.tinyfish_agent.status} />
          <Bot className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-slate-400 text-xs flex-1">TinyFish Agent</span>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                s.tinyfish_agent.mode === "live" ? "text-emerald-400" : "text-amber-400"
              }
            >
              {s.tinyfish_agent.mode === "live" ? "Live" : "Demo"}
            </span>
            <span className="text-slate-600">
              {s.tinyfish_agent.supported_payers} payers
            </span>
          </div>
        </div>

        {/* Claude AI */}
        <div className="flex items-center gap-2.5">
          <StatusDot status={s.claude_ai.status} />
          <Cpu className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-slate-400 text-xs flex-1">Claude AI</span>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                s.claude_ai.status === "configured" ? "text-violet-400" : "text-slate-500"
              }
            >
              {s.claude_ai.status === "configured" ? "Opus 4.6 · adaptive" : "Demo mode"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          {health.active_tasks > 0 && (
            <span className="text-blue-400 font-semibold">
              {health.active_tasks} task{health.active_tasks !== 1 ? "s" : ""} running
            </span>
          )}
          {health.demo_mode && (
            <span className="text-amber-400/70">Demo mode — add TINYFISH_API_KEY for live</span>
          )}
        </div>
        <a
          href={`${BASE_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 hover:text-slate-400 text-xs transition-colors flex items-center gap-1"
        >
          API Docs
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
}
