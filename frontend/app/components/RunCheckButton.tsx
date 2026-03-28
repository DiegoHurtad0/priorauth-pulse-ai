"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Loader2, CheckCircle2, ExternalLink, X, Monitor } from "lucide-react";
import { triggerBatchCheck, getTaskStatus } from "@/lib/api";
import type { TaskStatusResponse } from "@/lib/api";

interface RunCheckButtonProps {
  onComplete: (result: TaskStatusResponse) => void;
}

type ButtonState = "idle" | "running" | "done" | "error";

const PAYER_NAMES = ["Aetna", "UnitedHealthcare", "Cigna", "Humana", "Anthem BCBS"];

/**
 * "Run Check All" button with live TinyFish stream panel.
 * 1. POSTs /run-check → task_id
 * 2. Polls /run-check/{task_id}/status every 2s
 * 3. When streaming_url is available, auto-opens embedded live browser panel
 * 4. Calls onComplete() when done so parent refreshes data
 */
export default function RunCheckButton({ onComplete }: RunCheckButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [showStream, setShowStream] = useState(false);
  const [currentPayer, setCurrentPayer] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamShownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      if (payerRef.current) clearInterval(payerRef.current);
    };
  }, []);

  const runCheck = useCallback(async () => {
    if (state === "running") return;

    setState("running");
    setTaskStatus(null);
    setShowStream(false);
    streamShownRef.current = false;

    const trigger = await triggerBatchCheck();
    if (!trigger) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
      return;
    }

    const { task_id } = trigger;
    let payerIndex = 0;

    payerRef.current = setInterval(() => {
      setCurrentPayer(PAYER_NAMES[payerIndex % PAYER_NAMES.length]);
      payerIndex++;
    }, 900);

    const poll = async (): Promise<void> => {
      const status = await getTaskStatus(task_id);
      if (!status) {
        pollRef.current = setTimeout(poll, 2000);
        return;
      }

      setTaskStatus(status);

      // Auto-open stream panel the first time a streaming_url arrives
      if (status.streaming_url && !streamShownRef.current) {
        streamShownRef.current = true;
        setShowStream(true);
      }

      if (status.status === "failed") {
        if (payerRef.current) clearInterval(payerRef.current);
        setState("error");
        setTimeout(() => setState("idle"), 4000);
        return;
      }

      if (status.status === "completed") {
        if (payerRef.current) clearInterval(payerRef.current);
        setState("done");
        onComplete(status);
        setTimeout(() => setState("idle"), 5000);
        return;
      }

      pollRef.current = setTimeout(poll, 2000);
    };

    setTimeout(poll, 2000);
  }, [state, onComplete]);

  const checksTotal = taskStatus?.checks_total ?? 0;
  const checksDone = taskStatus?.checks_done ?? 0;
  const progress = checksTotal > 0 ? Math.round((checksDone / checksTotal) * 100) : 0;
  const streamUrl = taskStatus?.streaming_url;
  const currentCheck = taskStatus?.current_check;

  return (
    <div className="flex flex-col items-end gap-3 w-full">
      {/* ── Button row ── */}
      <div className="flex items-center gap-3">
        {/* Watch Live toggle */}
        {state === "running" && streamUrl && (
          <button
            onClick={() => setShowStream((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>
            {showStream ? "Hide stream" : "Watch Live"}
          </button>
        )}

        {state === "done" && (
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold cursor-default"
          >
            <CheckCircle2 className="w-4 h-4" />
            {taskStatus?.total
              ? `${taskStatus.success}/${taskStatus.total} checks complete`
              : "Complete"}
          </button>
        )}

        {state === "error" && (
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold cursor-default"
          >
            Check failed — retry
          </button>
        )}

        {state === "running" && (
          <div className="flex items-center gap-3">
            {checksTotal > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-slate-500 text-xs tabular-nums">
                  {checksDone}/{checksTotal}
                </span>
              </div>
            )}
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold cursor-not-allowed"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">
                {currentCheck
                  ? `Checking ${currentCheck.split(" — ")[1] ?? currentPayer}…`
                  : `Checking ${currentPayer}…`}
              </span>
              <span className="sm:hidden">{progress}%</span>
            </button>
          </div>
        )}

        {state === "idle" && (
          <button
            onClick={runCheck}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Play className="w-4 h-4" />
            Run Check All
          </button>
        )}
      </div>

      {/* ── Live TinyFish stream panel ── */}
      {showStream && streamUrl && (
        <div className="w-full animate-slide-up">
          <div className="bg-slate-900 border border-red-500/30 rounded-xl overflow-hidden shadow-2xl shadow-red-500/10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                </span>
                <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-300 text-xs font-semibold flex-shrink-0">
                  TinyFish Live Agent
                </span>
                {currentCheck && (
                  <span className="text-slate-500 text-xs truncate">— {currentCheck}</span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title="Open fullscreen"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowStream(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 16:9 iframe */}
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                src={streamUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay"
                title="TinyFish live browser session"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700 flex items-center justify-between gap-4">
              <span className="text-slate-500 text-xs">
                Navigating payer portal · stealth browser · US proxy active
              </span>
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs transition-colors flex-shrink-0"
              >
                Open fullscreen →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
