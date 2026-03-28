"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Clock, Download, UserPlus } from "lucide-react";
import MetricsBar from "../components/MetricsBar";
import PatientTable from "../components/PatientTable";
import PatientModal from "../components/PatientModal";
import AddPatientModal from "../components/AddPatientModal";
import RunCheckButton from "../components/RunCheckButton";
import AlertToast from "../components/AlertToast";
import AgentOpsCard from "../components/AgentOpsCard";
import PayerAnalyticsCard from "../components/PayerAnalyticsCard";
import TinyFishRunsCard from "../components/TinyFishRunsCard";
import TinyFishIntegrationCard from "../components/TinyFishIntegrationCard";
import SystemHealthCard from "../components/SystemHealthCard";
import { getPatients, getMetrics } from "@/lib/api";
import type {
  Patient,
  MetricsResponse,
  TaskStatusResponse,
  PAStatus,
} from "@/lib/api";
import type { AlertToastData } from "../components/AlertToast";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

function formatLastUpdated(date: Date | null): string {
  if (!date) return "Never";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Main PriorAuth Pulse dashboard page.
 * Renders: MetricsBar → action bar → PatientTable.
 * Polls /patients and /metrics every 30s.
 * Detects status changes and surfaces AlertToasts.
 */
export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [alerts, setAlerts] = useState<AlertToastData[]>([]);

  // Track previously seen statuses to detect changes during polling
  const prevStatusRef = useRef<Map<string, PAStatus>>(new Map());

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const [patientsRes, metricsRes] = await Promise.all([
      getPatients(),
      getMetrics(),
    ]);

    if (patientsRes) {
      // Detect status changes vs previous poll
      const newAlerts: AlertToastData[] = [];
      const newStatusMap = new Map<string, PAStatus>();

      for (const patient of patientsRes.patients) {
        for (const check of patient.latest_checks) {
          const key = `${patient.member_id}::${check.payer_name}`;
          newStatusMap.set(key, check.auth_status);

          const prev = prevStatusRef.current.get(key);
          if (prev && prev !== check.auth_status) {
            newAlerts.push({
              id: `${key}-${Date.now()}`,
              patient_name: patient.name,
              member_id: patient.member_id,
              payer_name: check.payer_name,
              old_status: prev,
              new_status: check.auth_status,
              denial_reason: check.denial_reason,
            });
          }
        }
      }

      prevStatusRef.current = newStatusMap;

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 5));
      }

      setPatients(patientsRes.patients);
    }

    if (metricsRes) {
      setMetrics(metricsRes);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    refresh(true);
  }, [refresh]);

  // 30-second polling
  useEffect(() => {
    const interval = setInterval(() => refresh(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleRunComplete = useCallback(
    (_result: TaskStatusResponse) => {
      // Refresh data after batch check completes
      refresh(false);
    },
    [refresh]
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const exportCSV = useCallback(() => {
    if (patients.length === 0) return;
    const rows: string[] = [
      "Patient,Member ID,CPT Code,Payer,Status,Auth #,Decision Date,Expiration Date,Denial Reason,Last Checked",
    ];
    for (const p of patients) {
      for (const check of p.latest_checks) {
        rows.push(
          [
            `"${p.name}"`,
            p.member_id,
            p.cpt_code,
            check.payer_name,
            check.auth_status,
            check.auth_number ?? "",
            check.decision_date ?? "",
            check.expiration_date ?? "",
            `"${(check.denial_reason ?? "").replace(/"/g, "'")}"`,
            check.checked_at,
          ].join(",")
        );
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `priorauth-pulse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [patients]);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* ── Section 1: Metrics ─────────────────── */}
      <MetricsBar metrics={metrics} loading={loading} />

      {/* ── Section 2: Action bar ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white text-xl font-bold">
            Prior Authorization Monitor
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-xs">
              Last updated: {formatLastUpdated(lastUpdated)}
            </span>
            <button
              onClick={() => refresh(false)}
              className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
              aria-label="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPatient(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Patient
          </button>
          <RunCheckButton onComplete={handleRunComplete} />
        </div>
      </div>

      {/* ── Section 3: Patient table ───────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs">
            {patients.reduce((n, p) => n + p.payers.length, 0)} authorization checks
          </span>
          {patients.length > 0 && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
        <PatientTable
          patients={patients}
          loading={loading}
          onPatientClick={setSelectedPatient}
        />
      </div>

      {/* ── Analytics row ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PayerAnalyticsCard />
        <AgentOpsCard />
      </div>

      {/* ── TinyFish Live Runs + Integration ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TinyFishRunsCard />
        <TinyFishIntegrationCard />
      </div>

      {/* ── System Health + API Docs ────────────── */}
      <SystemHealthCard />

      {/* ── Payer coverage strip ───────────────── */}
      {metrics?.supported_payers && metrics.supported_payers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 text-xs">Monitoring:</span>
          {metrics.supported_payers.map((payer) => (
            <span
              key={payer}
              className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full"
            >
              {payer}
            </span>
          ))}
        </div>
      )}

      {/* ── ROI callout ────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Annual ROI for a 5-coordinator clinic
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-white text-2xl font-bold">96×</span>
              <span className="text-slate-400 text-sm">return on investment</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-red-400/70 text-xs">Before</p>
              <p className="text-red-400 text-lg font-bold">$228,800/yr</p>
              <p className="text-slate-500 text-xs">5 coordinators × $22/hr</p>
            </div>
            <div>
              <p className="text-emerald-400/70 text-xs">After</p>
              <p className="text-emerald-400 text-lg font-bold">$199/mo</p>
              <p className="text-slate-500 text-xs">Unlimited patients</p>
            </div>
            <div>
              <p className="text-blue-400/70 text-xs">TinyFish cost</p>
              <p className="text-blue-400 text-lg font-bold">$0.04</p>
              <p className="text-slate-500 text-xs">per PA check (all-in)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Patient detail modal ───────────────── */}
      <PatientModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />

      {/* ── Add patient modal ──────────────────── */}
      {showAddPatient && (
        <AddPatientModal
          onClose={() => setShowAddPatient(false)}
          onAdded={() => refresh(false)}
        />
      )}

      {/* ── Alert toasts ───────────────────────── */}
      {alerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 items-end">
          {alerts.map((alert) => (
            <AlertToast
              key={alert.id}
              alert={alert}
              onDismiss={dismissAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
