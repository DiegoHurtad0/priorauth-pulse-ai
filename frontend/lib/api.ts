/**
 * api.ts — Typed fetch functions for the PriorAuth Pulse FastAPI backend.
 * All functions return null on error and log to console.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────

export type PAStatus =
  | "Approved"
  | "Pending"
  | "Denied"
  | "Info Needed"
  | "In Review"
  | "Expired"
  | "Not Found"
  | "Portal Unavailable";

export interface PACheck {
  patient_name: string;
  member_id: string;
  payer_name: string;
  auth_status: PAStatus;
  auth_number: string | null;
  decision_date: string | null;
  expiration_date: string | null;
  requesting_provider: string | null;
  service_description: string | null;
  denial_reason: string | null;
  next_action_required: string | null;
  extraction_timestamp: string;
  status_changed: boolean;
  run_id: string | null;
  streaming_url: string | null;
  checked_at: string;
}

export interface Patient {
  name: string;
  dob: string;
  member_id: string;
  cpt_code: string;
  payers: string[];
  pa_active: boolean;
  created_at: string;
  latest_checks: PACheck[];
}

export interface PatientsResponse {
  patients: Patient[];
  total: number;
}

export interface MetricsResponse {
  active_patients: number;
  total_checks_24h: number;
  status_changes_24h: number;
  success_rate_24h: number;
  approved_24h: number;
  denied_24h: number;
  pending_24h: number;
  supported_payers: string[];
  avg_check_duration_seconds: number;
}

export interface ChecksResponse {
  checks: PACheck[];
  total: number;
}

export interface HistoryResponse {
  member_id: string;
  checks: PACheck[];
  total: number;
}

export type TaskStatus = "running" | "completed" | "failed";

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  started_at?: string;
  completed_at?: string;
  total?: number;
  success?: number;
  failed?: number;
  success_rate?: number;
  error?: string;
  streaming_url?: string | null;
  current_check?: string | null;
  checks_done?: number;
  checks_total?: number;
}

export interface AgentOpsMetrics {
  total_runs: number;
  success_rate: number;
  avg_duration_seconds: number;
  last_24h_runs: number;
  last_24h_success_rate: number;
  session_replay_url?: string | null;
  top_payers: { name: string; runs: number; success_rate: number }[];
}

// ─────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`GET ${path} → ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`GET ${path} failed:`, err);
    return null;
  }
}

async function post<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.error(`POST ${path} → ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`POST ${path} failed:`, err);
    return null;
  }
}

// ─────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────

/** Fetch all active patients with their latest PA check per payer. */
export async function getPatients(): Promise<PatientsResponse | null> {
  return get<PatientsResponse>("/patients");
}

/** Fetch dashboard KPI metrics for the last 24 hours. */
export async function getMetrics(): Promise<MetricsResponse | null> {
  return get<MetricsResponse>("/metrics");
}

/** Fetch recent PA checks, status changes first. */
export async function getRecentChecks(
  limit = 50
): Promise<ChecksResponse | null> {
  return get<ChecksResponse>(`/pa-checks/recent?limit=${limit}`);
}

/** Fetch PA check history for a specific patient. */
export async function getPatientHistory(
  memberId: string,
  limit = 20
): Promise<HistoryResponse | null> {
  return get<HistoryResponse>(
    `/patients/${encodeURIComponent(memberId)}/history?limit=${limit}`
  );
}

/** Trigger a full batch PA check. Returns the task_id for polling. */
export async function triggerBatchCheck(): Promise<{
  task_id: string;
  message: string;
} | null> {
  return post<{ task_id: string; message: string }>("/run-check");
}

/** Poll the status of a batch check task. */
export async function getTaskStatus(
  taskId: string
): Promise<TaskStatusResponse | null> {
  return get<TaskStatusResponse>(`/run-check/${taskId}/status`);
}

/** Fetch AgentOps-style monitoring metrics. */
export async function getAgentOpsMetrics(): Promise<AgentOpsMetrics | null> {
  return get<AgentOpsMetrics>("/agentops/metrics");
}

export interface AppealResponse {
  member_id: string;
  payer_name: string;
  letter: string;
  generated_at: string;
}

/** Generate an AI appeal letter for a denied PA using Claude claude-opus-4-6. */
export async function generateAppealLetter(
  memberId: string,
  payerName: string,
  denialReason: string,
  authNumber?: string | null
): Promise<AppealResponse | null> {
  return post<AppealResponse>(`/patients/${encodeURIComponent(memberId)}/appeal`, {
    payer_name: payerName,
    denial_reason: denialReason,
    auth_number: authNumber,
  });
}
