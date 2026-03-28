"use client";

import { useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { PAStatus } from "@/lib/api";

export interface AlertToastData {
  id: string;
  patient_name: string;
  member_id: string;
  payer_name: string;
  old_status: PAStatus;
  new_status: PAStatus;
  denial_reason?: string | null;
}

interface AlertToastProps {
  alert: AlertToastData;
  onDismiss: (id: string) => void;
}

/**
 * Slide-up toast notification for PA status changes.
 * Appears from bottom-right and auto-dismisses after 8 seconds.
 */
export default function AlertToast({ alert, onDismiss }: AlertToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(alert.id), 8000);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  const isDenied = alert.new_status === "Denied";

  return (
    <div
      className={`
        w-80 rounded-xl border shadow-2xl shadow-black/40 p-4 animate-slide-up
        ${isDenied
          ? "bg-slate-800 border-red-500/40"
          : "bg-slate-800 border-slate-700"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-white text-sm font-semibold leading-tight">
            PA Status Changed
          </p>
          <p className="text-slate-400 text-xs mt-0.5">{alert.payer_name}</p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Patient */}
      <p className="text-slate-200 text-sm font-medium">{alert.patient_name}</p>
      <p className="text-slate-500 text-xs mb-3">{alert.member_id}</p>

      {/* Status transition */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={alert.old_status} size="sm" showDot={false} />
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <StatusBadge status={alert.new_status} size="sm" />
      </div>

      {/* Denial reason */}
      {isDenied && alert.denial_reason && (
        <p className="text-red-400/80 text-xs mt-2 line-clamp-2">
          {alert.denial_reason}
        </p>
      )}

      {/* Auto-dismiss progress bar */}
      <div className="mt-3 h-0.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            isDenied ? "bg-red-500" : "bg-blue-500"
          }`}
          style={{ animation: "shrink 8s linear forwards" }}
        />
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
