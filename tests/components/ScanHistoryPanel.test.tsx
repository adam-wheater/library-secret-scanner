import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScanHistoryPanel } from "../../src/components/ScanHistoryPanel";
import { ScanHistoryEntry } from "../../src/models/interfaces";

function makeEntry(overrides: Partial<ScanHistoryEntry> = {}): ScanHistoryEntry {
  return {
    id: "entry-1",
    scannedAt: "2025-01-15T10:30:00Z",
    totalGroups: 10,
    totalVariables: 50,
    totalAlreadySecret: 20,
    totalFindings: 5,
    findingsByRepo: { GroupA: 3, GroupB: 2 },
    ...overrides,
  };
}

describe("ScanHistoryPanel", () => {
  test("renders empty state when no entries", () => {
    render(<ScanHistoryPanel entries={[]} />);
    expect(
      screen.getByText("No scan history yet. Run a scan to start tracking results over time.")
    ).toBeInTheDocument();
  });

  test("renders header", () => {
    render(<ScanHistoryPanel entries={[]} />);
    expect(screen.getByText("Scan History")).toBeInTheDocument();
  });

  test("renders table with entries", () => {
    render(<ScanHistoryPanel entries={[makeEntry()]} />);
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Variables")).toBeInTheDocument();
    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Delta")).toBeInTheDocument();
  });

  test("shows First scan for an entry recorded with no previous scan", () => {
    render(<ScanHistoryPanel entries={[makeEntry()]} />);
    expect(screen.getByText("First scan")).toBeInTheDocument();
  });

  test("does not label the oldest retained entry as First scan once history is capped", () => {
    // After the cap trims the real first scan, the oldest remaining entry still
    // carries delta fields and must show them, not "First scan".
    const entries = [
      makeEntry({ id: "e2", newFindings: 1, resolvedFindings: 0 }),
      makeEntry({ id: "e1", newFindings: 0, resolvedFindings: 0 }),
    ];
    render(<ScanHistoryPanel entries={entries} />);
    expect(screen.queryByText("First scan")).toBeNull();
    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  test("shows new findings badge", () => {
    const entries = [
      makeEntry({ id: "e2", newFindings: 3, resolvedFindings: 0 }),
      makeEntry({ id: "e1" }),
    ];
    render(<ScanHistoryPanel entries={entries} />);
    expect(screen.getByText("+3 new")).toBeInTheDocument();
  });

  test("shows resolved findings badge", () => {
    const entries = [
      makeEntry({ id: "e2", newFindings: 0, resolvedFindings: 2 }),
      makeEntry({ id: "e1" }),
    ];
    render(<ScanHistoryPanel entries={entries} />);
    expect(screen.getByText("-2 resolved")).toBeInTheDocument();
  });

  test("shows No change when both deltas are 0", () => {
    const entries = [
      makeEntry({ id: "e2", newFindings: 0, resolvedFindings: 0 }),
      makeEntry({ id: "e1" }),
    ];
    render(<ScanHistoryPanel entries={entries} />);
    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  test("shows finding count with correct formatting", () => {
    render(<ScanHistoryPanel entries={[makeEntry({ totalFindings: 0 })]} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("renders multiple entries", () => {
    const entries = [
      makeEntry({
        id: "e3",
        scannedAt: "2025-03-15T10:00:00Z",
        newFindings: 1,
        resolvedFindings: 0,
      }),
      makeEntry({
        id: "e2",
        scannedAt: "2025-02-15T10:00:00Z",
        newFindings: 0,
        resolvedFindings: 2,
      }),
      makeEntry({ id: "e1", scannedAt: "2025-01-15T10:00:00Z" }),
    ];
    render(<ScanHistoryPanel entries={entries} />);
    // Should have 3 rows in the tbody
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });
});
