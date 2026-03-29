/**
 * api.test.ts — Tests for the typed API client (lib/api.ts).
 *
 * Verifies:
 * - All fetch functions handle 200 responses correctly
 * - All fetch functions return null on network errors (never throw)
 * - Response types match their TypeScript interfaces
 */

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Reset mocks between tests
beforeEach(() => {
  mockFetch.mockReset();
  jest.resetModules();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
  });
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error("Network error"));
}

// ── getPatients ───────────────────────────────────────────────────────────────

describe("getPatients", () => {
  test("returns parsed PatientsResponse on success", async () => {
    const { getPatients } = await import("../lib/api");
    mockResponse({ patients: [], total: 0 });
    const result = await getPatients();
    expect(result).not.toBeNull();
    expect(result!.patients).toEqual([]);
    expect(result!.total).toBe(0);
  });

  test("returns null on network error", async () => {
    const { getPatients } = await import("../lib/api");
    mockNetworkError();
    const result = await getPatients();
    expect(result).toBeNull();
  });

  test("returns null on 500 response", async () => {
    const { getPatients } = await import("../lib/api");
    mockResponse({ error: "Server error" }, 500);
    const result = await getPatients();
    expect(result).toBeNull();
  });

  test("calls the correct endpoint", async () => {
    const { getPatients } = await import("../lib/api");
    mockResponse({ patients: [], total: 0 });
    await getPatients();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/patients"),
      expect.any(Object)
    );
  });
});

// ── getMetrics ────────────────────────────────────────────────────────────────

describe("getMetrics", () => {
  test("returns MetricsResponse on success", async () => {
    const { getMetrics } = await import("../lib/api");
    mockResponse({
      active_patients: 15,
      total_checks_24h: 22,
      status_changes_24h: 3,
      success_rate_24h: 98.7,
      approved_24h: 11,
      denied_24h: 3,
      pending_24h: 8,
      supported_payers: ["Aetna", "UnitedHealthcare"],
      avg_check_duration_seconds: 134,
    });
    const result = await getMetrics();
    expect(result).not.toBeNull();
    expect(result!.active_patients).toBe(15);
    expect(result!.supported_payers).toContain("Aetna");
  });

  test("returns null on network error", async () => {
    const { getMetrics } = await import("../lib/api");
    mockNetworkError();
    const result = await getMetrics();
    expect(result).toBeNull();
  });
});

// ── triggerBatchCheck ─────────────────────────────────────────────────────────

describe("triggerBatchCheck", () => {
  test("calls POST /run-check and returns task info", async () => {
    const { triggerBatchCheck } = await import("../lib/api");
    mockResponse({ message: "Batch check started", task_id: "abc-123" });
    const result = await triggerBatchCheck();
    expect(result).not.toBeNull();
    expect(result!.task_id).toBe("abc-123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/run-check"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("returns null on failure", async () => {
    const { triggerBatchCheck } = await import("../lib/api");
    mockNetworkError();
    const result = await triggerBatchCheck();
    expect(result).toBeNull();
  });
});

// ── getPatientHistory ─────────────────────────────────────────────────────────

describe("getPatientHistory", () => {
  test("returns check history for a member_id", async () => {
    const { getPatientHistory } = await import("../lib/api");
    mockResponse({
      member_id: "AET-001-78234",
      checks: [
        {
          payer_name: "Aetna",
          auth_status: "Approved",
          checked_at: "2026-03-28T12:00:00Z",
          status_changed: false,
        },
      ],
      total: 1,
    });
    const result = await getPatientHistory("AET-001-78234");
    expect(result).not.toBeNull();
    expect(result!.checks).toHaveLength(1);
    expect(result!.checks[0].auth_status).toBe("Approved");
  });

  test("calls the correct endpoint with member_id", async () => {
    const { getPatientHistory } = await import("../lib/api");
    mockResponse({ member_id: "AET-001", checks: [], total: 0 });
    await getPatientHistory("AET-001", 10);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/patients/AET-001/history"),
      expect.any(Object)
    );
  });

  test("returns null on 404", async () => {
    const { getPatientHistory } = await import("../lib/api");
    mockResponse({ error: "Not found" }, 404);
    const result = await getPatientHistory("NOTEXIST");
    expect(result).toBeNull();
  });
});

// ── getAgentOpsMetrics ────────────────────────────────────────────────────────

describe("getAgentOpsMetrics", () => {
  test("returns agent ops metrics", async () => {
    const { getAgentOpsMetrics } = await import("../lib/api");
    mockResponse({
      total_runs: 1247,
      success_rate: 98.2,
      avg_duration_seconds: 134,
      last_24h_runs: 87,
      last_24h_success_rate: 100.0,
      top_payers: [{ name: "Aetna", runs: 312, success_rate: 98.7 }],
    });
    const result = await getAgentOpsMetrics();
    expect(result).not.toBeNull();
    expect(result!.total_runs).toBe(1247);
    expect(result!.top_payers[0].name).toBe("Aetna");
  });

  test("returns null on error", async () => {
    const { getAgentOpsMetrics } = await import("../lib/api");
    mockNetworkError();
    const result = await getAgentOpsMetrics();
    expect(result).toBeNull();
  });
});

// ── getLiveRuns ───────────────────────────────────────────────────────────────

describe("getLiveRuns", () => {
  test("returns live runs response", async () => {
    const { getLiveRuns } = await import("../lib/api");
    mockResponse({
      runs: [
        {
          run_id: "550e8400-e29b-41d4-a716-446655440000",
          payer_name: "Aetna",
          auth_status: "Approved",
          steps_executed: 147,
          checked_at: "2026-03-28T12:00:00Z",
        },
      ],
      total_real_runs: 1,
      message: "1 real TinyFish agent executions recorded",
    });
    const result = await getLiveRuns();
    expect(result).not.toBeNull();
    expect(result!.runs).toHaveLength(1);
    expect(result!.total_real_runs).toBe(1);
  });

  test("calls /pa-checks/live-runs endpoint", async () => {
    const { getLiveRuns } = await import("../lib/api");
    mockResponse({ runs: [], total_real_runs: 0, message: "0 runs" });
    await getLiveRuns(10);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/pa-checks/live-runs"),
      expect.any(Object)
    );
  });
});
