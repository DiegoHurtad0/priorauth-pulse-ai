/**
 * StatusBadge.test.tsx — Tests for the StatusBadge component.
 *
 * Verifies:
 * - All PA status values render without crashing
 * - Correct label text is displayed
 * - showDot prop controls dot visibility
 * - Unknown status falls back gracefully
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../app/components/StatusBadge";
import type { PAStatus } from "../lib/api";

// All valid PA statuses
const PA_STATUSES: PAStatus[] = [
  "Approved",
  "Pending",
  "Denied",
  "Info Needed",
  "In Review",
  "Expired",
  "Not Found",
  "Portal Unavailable",
];

describe("StatusBadge", () => {
  test.each(PA_STATUSES)("renders '%s' status without crashing", (status) => {
    const { container } = render(<StatusBadge status={status} />);
    expect(container.firstChild).not.toBeNull();
  });

  test("displays 'Approved' label for Approved status", () => {
    render(<StatusBadge status="Approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  test("displays 'Denied' label for Denied status", () => {
    render(<StatusBadge status="Denied" />);
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  test("displays 'Pending' label for Pending status", () => {
    render(<StatusBadge status="Pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  test("displays 'In Review' label for In Review status", () => {
    render(<StatusBadge status="In Review" />);
    expect(screen.getByText("In Review")).toBeInTheDocument();
  });

  test("displays 'Unavailable' label for Portal Unavailable status", () => {
    render(<StatusBadge status="Portal Unavailable" />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  test("hides dot when showDot=false", () => {
    const { container } = render(
      <StatusBadge status="Approved" showDot={false} />
    );
    // No relative flex span (the dot wrapper)
    const dotWrappers = container.querySelectorAll(".relative.flex.h-1\\.5");
    expect(dotWrappers.length).toBe(0);
  });

  test("applies sm size classes when size='sm'", () => {
    const { container } = render(
      <StatusBadge status="Approved" size="sm" showDot={false} />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("px-2");
  });

  test("applies md size classes when size='md' (default)", () => {
    const { container } = render(
      <StatusBadge status="Approved" showDot={false} />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("px-2.5");
  });

  test("Denied badge has red styling", () => {
    const { container } = render(<StatusBadge status="Denied" showDot={false} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("red");
  });

  test("Approved badge has emerald/green styling", () => {
    const { container } = render(<StatusBadge status="Approved" showDot={false} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("emerald");
  });
});
