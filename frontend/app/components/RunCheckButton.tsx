"use client";

import { useState, useCallback } from "react";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import { triggerBatchCheck, getTaskStatus } from "@/lib/api";
import type { TaskStatusResponse } from "@/lib/api";

interface RunCheckButtonProps {
  onComplete: (result: TaskStatusResponse) => void;
}

type ButtonState = "idle" | "running" | "done" | "error";

const PAYER_NAMES = ["Aetna", "UnitedHealthcare", "Cigna", "Humana", "Anthem BCBS"];

/**
 * "Run Check All" button that:
 * 1. POSTs to /run-check to get a task_id
 * 2. Polls /run-check/{task_id}/status every 2s
 * 3. Shows animated progress while running
 * 4. Calls onComplete() when done so parent can refresh data
 */
export default function RunCheckButton({ onComplete }: RunCheckButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPayer, setCurrentPayer] = useState("");

  const runCheck = useCallback(async () => {
    if (state === "running") return;

    setState("running");
    setProgress(0);

    const trigger = await triggerBatchCheck();
    if (!trigger) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
      return;
    }

    const { task_id } = trigger;
    let payerIndex = 0;

    // Animate payer cycling while waiting for real results
    const payerInterval = setInterval(() => {
      setCurrentPayer(PAYER_NAMES[payerIndex % PAYER_NAMES.length]);
      payerIndex++;
    }, 800);

    // Simulate progress increment until backend completes
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 3, 90);
      setProgress(Math.floor(fakeProgress));
    }, 400);

    // Poll for real status
    const poll = async (): Promise<void> => {
      const status = await getTaskStatus(task_id);

      if (!status || status.status === "failed") {
        clearInterval(payerInterval);
        clearInterval(progressInterval);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      if (status.status === "completed") {
        clearInterval(payerInterval);
        clearInterval(progressInterval);
        setProgress(100);
        setTotal(status.total ?? 0);
        setState("done");
        onComplete(status);
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      // Still running — poll again in 2s
      setTimeout(poll, 2000);
    };

    setTimeout(poll, 2000);
  }, [state, onComplete]);

  if (state === "done") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold cursor-default"
      >
        <CheckCircle2 className="w-4 h-4" />
        {total > 0 ? `${total} checks complete` : "Complete"}
      </button>
    );
  }

  if (state === "error") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold cursor-default"
      >
        Check failed — retry
      </button>
    );
  }

  if (state === "running") {
    return (
      <div className="flex items-center gap-3">
        {/* Mini progress bar */}
        <div className="hidden sm:block w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold cursor-not-allowed"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">
            {currentPayer ? `Checking ${currentPayer}…` : "Checking portals…"}
          </span>
          <span className="sm:hidden">{progress}%</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={runCheck}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
    >
      <Play className="w-4 h-4" />
      Run Check All
    </button>
  );
}
