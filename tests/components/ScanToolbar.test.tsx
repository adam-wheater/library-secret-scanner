import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScanToolbar } from "../../src/components/ScanToolbar";
import { Severity, Confidence, SecretFinding, MatchSource } from "../../src/models/interfaces";
function makeFinding(overrides: Partial<SecretFinding> = {}): SecretFinding {
  return {
    variableGroupId: 1,
    variableGroupName: "G",
    variableName: "v",
    variableValue: "val",
    isAlreadySecret: false,
    severity: Severity.Critical,
    matchSource: MatchSource.VariableName,
    patternName: "p",
    description: "d",
    confidence: Confidence.High,
    ...overrides,
  };
}

function renderToolbar(overrides: Partial<React.ComponentProps<typeof ScanToolbar>> = {}) {
  const defaultProps: React.ComponentProps<typeof ScanToolbar> = {
    groupSearchTerm: "",
    onSearchChange: jest.fn(),
    filterSeverity: "all",
    onFilterSeverityChange: jest.fn(),
    filterConfidence: "all",
    onFilterConfidenceChange: jest.fn(),
    showCleanGroups: false,
    onShowCleanGroupsChange: jest.fn(),
    showUnusedOnly: false,
    onShowUnusedOnlyChange: jest.fn(),
    allVisibleFindings: [makeFinding()],
    allVisibleSelected: false,
    someVisibleSelected: false,
    onSelectAll: jest.fn(),
    onExpandAll: jest.fn(),
    onCollapseAll: jest.fn(),
    selectedCount: 0,
    onBulkIgnore: jest.fn(),
    onBulkMarkAsSecret: jest.fn(),
    markingAsSecret: false,
    bulkIgnoring: false,
    totalFindings: 1,
    onExportCsv: jest.fn(),
    ...overrides,
  };
  return { ...render(<ScanToolbar {...defaultProps} />), props: defaultProps };
}

describe("ScanToolbar", () => {
  test("renders search input", () => {
    renderToolbar();
    expect(screen.getByPlaceholderText("Search groups by name...")).toBeInTheDocument();
  });

  test("renders severity filter dropdown", () => {
    renderToolbar();
    expect(screen.getByText("Severity:")).toBeInTheDocument();
  });

  test("renders confidence filter dropdown", () => {
    renderToolbar();
    expect(screen.getByText("Confidence:")).toBeInTheDocument();
  });

  test("renders Expand All and Collapse All buttons", () => {
    renderToolbar();
    expect(screen.getByText("Expand All")).toBeInTheDocument();
    expect(screen.getByText("Collapse All")).toBeInTheDocument();
  });

  test("renders Export CSV button when totalFindings > 0", () => {
    renderToolbar({ totalFindings: 5 });
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
  });

  test("does not render Export CSV button when totalFindings = 0", () => {
    renderToolbar({ totalFindings: 0 });
    expect(screen.queryByText("Export CSV")).toBeNull();
  });

  test("renders Select all checkbox when allVisibleFindings are present", () => {
    renderToolbar({ allVisibleFindings: [makeFinding()] });
    expect(screen.getByText(/Select all/)).toBeInTheDocument();
  });

  test("does not show bulk action buttons when selectedCount is 0", () => {
    renderToolbar({ selectedCount: 0 });
    expect(screen.queryByText(/Ignore Selected/)).toBeNull();
    expect(screen.queryByText(/Mark as Secret/)).toBeNull();
  });

  test("shows bulk action buttons when selectedCount > 0", () => {
    renderToolbar({ selectedCount: 3 });
    expect(screen.getByText("Ignore Selected (3)")).toBeInTheDocument();
    expect(screen.getByText("Mark as Secret (3)")).toBeInTheDocument();
  });

  test("calls onBulkIgnore when Ignore Selected is clicked", () => {
    const onBulkIgnore = jest.fn();
    renderToolbar({ selectedCount: 2, onBulkIgnore });
    fireEvent.click(screen.getByText("Ignore Selected (2)"));
    expect(onBulkIgnore).toHaveBeenCalled();
  });

  test("calls onExportCsv when Export CSV is clicked", () => {
    const onExportCsv = jest.fn();
    renderToolbar({ totalFindings: 1, onExportCsv });
    fireEvent.click(screen.getByText("Export CSV"));
    expect(onExportCsv).toHaveBeenCalled();
  });

  test("calls onExpandAll when Expand All is clicked", () => {
    const onExpandAll = jest.fn();
    renderToolbar({ onExpandAll });
    fireEvent.click(screen.getByText("Expand All"));
    expect(onExpandAll).toHaveBeenCalled();
  });

  test("calls onCollapseAll when Collapse All is clicked", () => {
    const onCollapseAll = jest.fn();
    renderToolbar({ onCollapseAll });
    fireEvent.click(screen.getByText("Collapse All"));
    expect(onCollapseAll).toHaveBeenCalled();
  });

  test("calls onSearchChange when text is typed in search", () => {
    const onSearchChange = jest.fn();
    renderToolbar({ onSearchChange });
    fireEvent.change(screen.getByPlaceholderText("Search groups by name..."), {
      target: { value: "test" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });
});
