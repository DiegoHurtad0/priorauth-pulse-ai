"use client";

import { useState } from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Patient, PACheck } from "@/lib/api";

interface PatientTableProps {
  patients: Patient[];
  loading?: boolean;
  onPatientClick: (patient: Patient) => void;
}

const PAGE_SIZE = 20;

/** Format ISO datetime to relative or short string. */
function formatCheckedAt(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffH = diffMs / 1000 / 60 / 60;
    if (diffH < 1) return `${Math.round(diffH * 60)}m ago`;
    if (diffH < 24) return `${Math.round(diffH)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/** Flatten one patient into one row per payer check. */
function flattenToRows(
  patients: Patient[]
): Array<{ patient: Patient; check: PACheck | null; payer: string }> {
  const rows: Array<{ patient: Patient; check: PACheck | null; payer: string }> = [];

  for (const patient of patients) {
    for (const payer of patient.payers) {
      const check =
        patient.latest_checks.find((c) => c.payer_name === payer) ?? null;
      rows.push({ patient, check, payer });
    }
  }

  // Sort: status_changed rows first, then by checked_at desc
  rows.sort((a, b) => {
    const aChanged = a.check?.status_changed ? 1 : 0;
    const bChanged = b.check?.status_changed ? 1 : 0;
    if (bChanged !== aChanged) return bChanged - aChanged;
    const aTime = a.check?.checked_at ? new Date(a.check.checked_at).getTime() : 0;
    const bTime = b.check?.checked_at ? new Date(b.check.checked_at).getTime() : 0;
    return bTime - aTime;
  });

  return rows;
}

/**
 * Full patient × payer table with pagination.
 * Denied rows have a subtle red tint; status-changed rows float to top.
 * Clicking the eye icon or row opens PatientModal.
 */
export default function PatientTable({
  patients,
  loading = false,
  onPatientClick,
}: PatientTableProps) {
  const [page, setPage] = useState(0);

  const rows = flattenToRows(patients);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="h-5 w-48 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-700/50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4">
              <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-700 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <p className="text-slate-400 text-sm">No patients found.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Patient
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Member ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payer
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Auth #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Last Checked
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {pageRows.map(({ patient, check, payer }, idx) => {
              const isDenied = check?.auth_status === "Denied";
              const isChanged = check?.status_changed === true;

              return (
                <tr
                  key={`${patient.member_id}-${payer}-${idx}`}
                  className={`
                    group transition-colors cursor-pointer
                    ${isDenied
                      ? "bg-red-500/5 hover:bg-red-500/10"
                      : isChanged
                      ? "bg-blue-500/5 hover:bg-blue-500/10"
                      : "hover:bg-slate-700/30"
                    }
                  `}
                  onClick={() => onPatientClick(patient)}
                >
                  {/* Patient name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isChanged && (
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
                        </span>
                      )}
                      <span className="text-slate-200 text-sm font-medium">
                        {patient.name}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      CPT: {patient.cpt_code}
                    </span>
                  </td>

                  {/* Member ID */}
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm font-mono">
                      {patient.member_id}
                    </span>
                  </td>

                  {/* Payer */}
                  <td className="px-4 py-3">
                    <span className="text-slate-300 text-sm">{payer}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {check ? (
                      <StatusBadge status={check.auth_status} />
                    ) : (
                      <span className="text-slate-600 text-xs">No data</span>
                    )}
                  </td>

                  {/* Auth # */}
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm font-mono">
                      {check?.auth_number ?? "—"}
                    </span>
                  </td>

                  {/* Last checked */}
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm">
                      {formatCheckedAt(check?.checked_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPatientClick(patient);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-xs font-medium"
                      aria-label={`View details for ${patient.name}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <p className="text-slate-500 text-xs">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of{" "}
            {rows.length} rows
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-xs px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
