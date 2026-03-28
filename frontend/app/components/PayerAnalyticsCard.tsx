"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PayerStat {
  payer: string;
  total_checks: number;
  approved: number;
  denied: number;
  pending: number;
  approval_rate: number;
  denial_rate: number;
}

/**
 * Payer Analytics card showing approval vs denial rates per payer.
 * Data comes from /analytics/payers (MongoDB aggregation).
 */
export default function PayerAnalyticsCard() {
  const [payers, setPayers] = useState<PayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${BASE_URL}/analytics/payers`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPayers(data.payers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (payers.length === 0) return null;

  const maxTotal = Math.max(...payers.map((p) => p.total_checks), 1);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-slate-300 text-sm font-semibold">Payer Analytics</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Approved</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Denied</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-600 inline-block" />Pending</span>
        </div>
      </div>

      {/* Payer rows */}
      <div className="space-y-3">
        {payers.map((p) => {
          const approvedPct = (p.approved / Math.max(p.total_checks, 1)) * 100;
          const deniedPct = (p.denied / Math.max(p.total_checks, 1)) * 100;
          const pendingPct = (p.pending / Math.max(p.total_checks, 1)) * 100;

          return (
            <div key={p.payer}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 text-xs font-medium w-36 truncate">{p.payer}</span>
                  {p.approval_rate >= 70 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : p.denial_rate >= 30 ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : (
                    <Minus className="w-3 h-3 text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-emerald-400">{p.approval_rate}%</span>
                  <span className="text-red-400">{p.denial_rate}%</span>
                  <span className="text-slate-500 w-14 text-right">{p.total_checks} checks</span>
                </div>
              </div>
              {/* Stacked bar */}
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${approvedPct}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${deniedPct}%` }}
                />
                <div
                  className="h-full bg-slate-500 transition-all"
                  style={{ width: `${pendingPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
        <span className="text-slate-500 text-xs">
          {payers.reduce((n, p) => n + p.total_checks, 0)} total checks across {payers.length} payers
        </span>
        <span className="text-slate-400 text-xs font-medium">
          Avg approval:{" "}
          <span className="text-emerald-400">
            {(payers.reduce((s, p) => s + p.approval_rate, 0) / Math.max(payers.length, 1)).toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  );
}
