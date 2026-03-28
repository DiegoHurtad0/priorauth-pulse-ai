"use client";

import { Users, Activity, TrendingUp, Bell } from "lucide-react";
import type { MetricsResponse } from "@/lib/api";

interface MetricsBarProps {
  metrics: MetricsResponse | null;
  loading?: boolean;
}

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  accentColor: string;
  pulse?: boolean;
  loading?: boolean;
}

/** Single KPI metric card. */
function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  accentColor,
  pulse = false,
  loading = false,
}: KPICardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accentColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-700 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {pulse && value !== 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
              </span>
            )}
          </div>
        )}
        {subtext && (
          <p className="text-slate-500 text-xs mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Four KPI cards displayed at the top of the dashboard.
 * Shows: Active Patients, Checks Today, Success Rate, Status Changes.
 */
export default function MetricsBar({ metrics, loading = false }: MetricsBarProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Active Patients"
        value={metrics?.active_patients ?? 0}
        subtext="across all payers"
        icon={Users}
        accentColor="bg-blue-500/10 text-blue-400"
        loading={loading}
      />
      <KPICard
        label="Checks Today"
        value={metrics?.total_checks_24h ?? 0}
        subtext="last 24 hours"
        icon={Activity}
        accentColor="bg-emerald-500/10 text-emerald-400"
        loading={loading}
      />
      <KPICard
        label="Success Rate"
        value={metrics ? `${metrics.success_rate_24h}%` : "—"}
        subtext={`${metrics?.approved_24h ?? 0} approved · ${metrics?.denied_24h ?? 0} denied`}
        icon={TrendingUp}
        accentColor="bg-violet-500/10 text-violet-400"
        loading={loading}
      />
      <KPICard
        label="Status Changes"
        value={metrics?.status_changes_24h ?? 0}
        subtext="alerts triggered"
        icon={Bell}
        accentColor="bg-orange-500/10 text-orange-400"
        pulse
        loading={loading}
      />
    </div>
  );
}
