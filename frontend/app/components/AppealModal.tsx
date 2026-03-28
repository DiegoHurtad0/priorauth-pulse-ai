"use client";

import { useState } from "react";
import { X, FileText, Copy, Download, Sparkles, AlertCircle } from "lucide-react";
import { generateAppealLetter } from "@/lib/api";
import type { Patient, PACheck } from "@/lib/api";

interface AppealModalProps {
  patient: Patient;
  deniedCheck: PACheck;
  onClose: () => void;
}

/**
 * Modal that generates a clinical AI appeal letter for a denied PA.
 * Uses Claude claude-opus-4-6 via the backend to write a peer-to-peer review letter.
 */
export default function AppealModal({ patient, deniedCheck, onClose }: AppealModalProps) {
  const [letter, setLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await generateAppealLetter(
      patient.member_id,
      deniedCheck.payer_name,
      deniedCheck.denial_reason ?? "Medical necessity not established",
      deniedCheck.auth_number
    );
    setLoading(false);
    if (res) {
      setLetter(res.letter);
    } else {
      setError("Failed to generate appeal letter. Please try again.");
    }
  };

  const handleCopy = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appeal-${patient.member_id}-${deniedCheck.payer_name.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">AI Appeal Letter</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {patient.name} &mdash; {deniedCheck.payer_name} &mdash; CPT {patient.cpt_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Denial context */}
        {deniedCheck.denial_reason && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-xs font-semibold">Denial Reason</p>
                <p className="text-red-300 text-sm mt-0.5">{deniedCheck.denial_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!letter && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-white text-base font-semibold mb-2">
                Generate Peer-to-Peer Appeal
              </h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6">
                Claude claude-opus-4-6 will write a clinically precise appeal letter citing
                evidence-based guidelines to overturn the denial.
              </p>
              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate with Claude
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-300 text-sm font-medium">
                Claude is drafting your appeal...
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Analyzing clinical guidelines and denial reason
              </p>
            </div>
          )}

          {letter && (
            <div>
              <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                {letter}
              </pre>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {letter && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 gap-3">
            <p className="text-slate-500 text-xs">
              Generated by Claude claude-opus-4-6 &mdash; review before sending
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/30 text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
