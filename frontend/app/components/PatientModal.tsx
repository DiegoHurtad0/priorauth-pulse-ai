"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ArrowRight, Calendar, Hash, Stethoscope, Sparkles } from "lucide-react";
import StatusBadge from "./StatusBadge";
import AppealModal from "./AppealModal";
import { getPatientHistory } from "@/lib/api";
import type { Patient, PACheck } from "@/lib/api";

interface PatientModalProps {
  patient: Patient | null;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Full-screen modal showing patient details and their complete PA check history
 * as a timeline, sorted newest first.
 */
export default function PatientModal({ patient, onClose }: PatientModalProps) {
  const [history, setHistory] = useState<PACheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [appealCheck, setAppealCheck] = useState<PACheck | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    const res = await getPatientHistory(patient.member_id, 20);
    setHistory(res?.checks ?? []);
    setLoading(false);
  }, [patient]);

  useEffect(() => {
    if (patient) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [patient, fetchHistory]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!patient) return null;

  return (
    <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-white text-xl font-bold">{patient.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Hash className="w-3.5 h-3.5" />
                {patient.member_id}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Calendar className="w-3.5 h-3.5" />
                DOB: {patient.dob}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Stethoscope className="w-3.5 h-3.5" />
                CPT: {patient.cpt_code}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status per payer */}
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Current Status by Payer
          </p>
          <div className="flex flex-wrap gap-3">
            {patient.payers.map((payer) => {
              const latest = patient.latest_checks.find(
                (c) => c.payer_name === payer
              );
              return (
                <div
                  key={payer}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <span className="text-slate-300 text-sm font-medium">
                    {payer}
                  </span>
                  {latest ? (
                    <StatusBadge status={latest.auth_status} size="sm" showDot={false} />
                  ) : (
                    <span className="text-slate-500 text-xs">No data</span>
                  )}
                  {latest?.auth_status === "Denied" && (
                    <button
                      onClick={() => setAppealCheck(latest)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-xs transition-colors"
                      title="Generate appeal letter"
                    >
                      <Sparkles className="w-3 h-3" />
                      Appeal
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* History timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Check History
          </p>

          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && history.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">
              No check history available.
            </p>
          )}

          {!loading && history.length > 0 && (
            <div className="relative space-y-3">
              {/* Timeline connector line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-px bg-slate-800" />

              {history.map((check, idx) => (
                <div
                  key={idx}
                  className={`relative flex gap-4 pl-1 ${
                    check.status_changed
                      ? "bg-slate-800/60 border border-slate-700 rounded-xl p-3"
                      : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center z-10">
                    <div
                      className={`w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                        check.status_changed
                          ? "bg-blue-400"
                          : "bg-slate-600"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-slate-300 text-sm font-medium">
                        {check.payer_name}
                      </span>
                      <StatusBadge status={check.auth_status} size="sm" showDot={false} />
                      {check.status_changed && (
                        <span className="flex items-center gap-1 text-blue-400 text-xs font-semibold">
                          <ArrowRight className="w-3 h-3" />
                          Status change
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 text-xs">
                      {formatDate(check.checked_at)}
                    </p>

                    {check.auth_number && (
                      <p className="text-slate-400 text-xs mt-1">
                        Auth #: <span className="text-slate-300">{check.auth_number}</span>
                      </p>
                    )}

                    {check.denial_reason && (
                      <p className="text-red-400 text-xs mt-1 line-clamp-2">
                        {check.denial_reason}
                      </p>
                    )}

                    {check.auth_status === "Denied" && (
                      <button
                        onClick={() => setAppealCheck(check)}
                        className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs font-medium transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Generate Appeal Letter
                      </button>
                    )}

                    {check.expiration_date && (
                      <p className="text-slate-500 text-xs mt-1">
                        Expires:{" "}
                        <span className="text-slate-400">
                          {formatDateOnly(check.expiration_date)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Appeal letter modal (stacked on top) */}
    {appealCheck && patient && (
      <AppealModal
        patient={patient}
        deniedCheck={appealCheck}
        onClose={() => setAppealCheck(null)}
      />
    )}
    </>
  );
}
