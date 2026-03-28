"use client";

import { useState } from "react";
import { X, UserPlus, Plus, Trash2 } from "lucide-react";

const PAYER_OPTIONS = [
  "Aetna",
  "UnitedHealthcare",
  "Cigna",
  "Humana",
  "Anthem BCBS",
];

const CPT_OPTIONS = [
  { code: "27447", label: "27447 — Total Knee Arthroplasty" },
  { code: "29827", label: "29827 — Rotator Cuff Repair" },
  { code: "27130", label: "27130 — Total Hip Arthroplasty" },
  { code: "43239", label: "43239 — Upper GI Endoscopy w/ Biopsy" },
  { code: "70553", label: "70553 — MRI Brain w/ Contrast" },
  { code: "64483", label: "64483 — Epidural Injection" },
  { code: "29881", label: "29881 — Knee Arthroscopy / Meniscectomy" },
  { code: "33533", label: "33533 — Coronary Artery Bypass" },
  { code: "33249", label: "33249 — ICD Implantation" },
];

interface AddPatientModalProps {
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Modal form to add a new patient to monitor.
 * Posts to POST /patients and refreshes the dashboard on success.
 */
export default function AddPatientModal({ onClose, onAdded }: AddPatientModalProps) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [memberId, setMemberId] = useState("");
  const [cptCode, setCptCode] = useState("27447");
  const [selectedPayers, setSelectedPayers] = useState<string[]>(["Aetna"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePayer = (payer: string) => {
    setSelectedPayers((prev) =>
      prev.includes(payer) ? prev.filter((p) => p !== payer) : [...prev, payer]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !memberId.trim() || selectedPayers.length === 0) {
      setError("Please fill in all required fields and select at least one payer.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dob: dob || "1970-01-01",
          member_id: memberId.trim(),
          cpt_code: cptCode,
          payers: selectedPayers,
          pa_active: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // FastAPI Pydantic v2 validation errors return detail as an array
        const detail = body.detail;
        if (Array.isArray(detail) && detail.length > 0) {
          const first = detail[0];
          throw new Error(first.msg?.replace(/^Value error, /, "") || `HTTP ${res.status}`);
        }
        throw new Error(typeof detail === "string" ? detail : `HTTP ${res.status}`);
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-white text-lg font-bold">Add Patient</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              Patient Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Member ID + DOB row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Member ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. AET-016-12345"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* CPT Code */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              CPT Code / Procedure
            </label>
            <select
              value={cptCode}
              onChange={(e) => setCptCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              {CPT_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Payers */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              Payers to Monitor <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYER_OPTIONS.map((payer) => {
                const active = selectedPayers.includes(payer);
                return (
                  <button
                    key={payer}
                    type="button"
                    onClick={() => togglePayer(payer)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {payer}
                  </button>
                );
              })}
            </div>
            {selectedPayers.length === 0 && (
              <p className="text-slate-500 text-xs mt-1">Select at least one payer</p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedPayers.length === 0}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Adding..." : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
