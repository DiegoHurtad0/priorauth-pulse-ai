"use client";

import { CheckCircle2, Clock, XCircle, AlertTriangle, Search, MinusCircle } from "lucide-react";
import type { PAStatus } from "@/lib/api";

interface StatusBadgeProps {
  status: PAStatus;
  showDot?: boolean;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  PAStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    dotColor: string;
    pulse: boolean;
  }
> = {
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-400",
    pulse: false,
  },
  Pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    dotColor: "bg-amber-400",
    pulse: false,
  },
  "In Review": {
    label: "In Review",
    icon: Search,
    className: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    dotColor: "bg-amber-400",
    pulse: false,
  },
  Denied: {
    label: "Denied",
    icon: XCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dotColor: "bg-red-400",
    pulse: true,
  },
  "Info Needed": {
    label: "Info Needed",
    icon: AlertTriangle,
    className: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    dotColor: "bg-orange-400",
    pulse: false,
  },
  Expired: {
    label: "Expired",
    icon: MinusCircle,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dotColor: "bg-slate-400",
    pulse: false,
  },
  "Not Found": {
    label: "Not Found",
    icon: MinusCircle,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dotColor: "bg-slate-400",
    pulse: false,
  },
  "Portal Unavailable": {
    label: "Unavailable",
    icon: MinusCircle,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dotColor: "bg-slate-400",
    pulse: false,
  },
};

/**
 * Color-coded status pill with icon and optional pulsing dot.
 * Denied status always shows a pulsing dot for urgency.
 */
export default function StatusBadge({
  status,
  showDot = true,
  size = "md",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["Not Found"];
  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 gap-1"
      : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${config.className}`}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`${config.dotColor} rounded-full h-1.5 w-1.5 ${
              config.pulse ? "ping-slow" : ""
            }`}
          />
        </span>
      )}
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {config.label}
    </span>
  );
}
