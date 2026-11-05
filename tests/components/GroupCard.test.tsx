import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GroupCard } from "../../src/components/GroupCard";
import {
  VariableGroupSummary,
  Severity,
  SecretFinding,
  MatchSource,
  Confidence,
} from "../../src/models/interfaces";
function makeFinding(overrides: Partial<SecretFinding> = {}): SecretFinding {
  return {
    variableGroupId: 1,
    variableGroupName: "TestGroup",
    variableName: "DbPassword",
    variableValue: "supersecretvalue123",
    isAlreadySecret: false,
    severity: Severity.Critical,
    matchSource: MatchSource.VariableName,
    patternName: "password-name",
    description: "Contains password",
    confidence: Confidence.High,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<VariableGroupSummary> = {}): VariableGroupSummary {
  return {
    id: 1,
    name: "TestGroup",
    description: "Test variable group",
    type: "Vsts",
    variableCount: 5,
    secretCount: 2,
    findings: [makeFinding()],
    pipelineReferences: [{ pipelineName: "build-pipeline", repoName: "repo" }],
    ...overrides,
  };
}

function renderGroupCard(overrides: Partial<React.ComponentProps<typeof GroupCard>> = {}) {
  const defaultProps: React.ComponentProps<typeof GroupCard> = {
    group: makeGroup(),
    expanded: false,
    onToggle: jest.fn(),
    filterSeverity: "all",
    onIgnoreFinding: jest.fn(),
    onMarkAsSecret: jest.fn(),
    selectedFindings: new Set(),
    onSelectFinding: jest.fn(),
    onSelectGroup: jest.fn(),
    busy: false,
    orgUrl: "https://dev.azure.com/org",
    projectName: "proj",
    ignoringFindingKey: null,
    ...overrides,
  };
  return { ...render(<GroupCard {...defaultProps} />), props: defaultProps };
}

describe("GroupCard", () => {
  test("renders the group name", () => {
    renderGroupCard();
    expect(screen.getByText("TestGroup")).toBeInTheDocument();
  });

  test("renders the group description", () => {
    renderGroupCard();
    expect(screen.getByText("Test variable group")).toBeInTheDocument();
  });

  test("shows variable and secret counts", () => {
    renderGroupCard();
    expect(screen.getByText("5 vars | 2 secret")).toBeInTheDocument();
  });

  test("shows findings count badge", () => {
    renderGroupCard();
    expect(screen.getByText("1 finding")).toBeInTheDocument();
  });

  test("shows Clean badge for groups with no findings", () => {
    renderGroupCard({ group: makeGroup({ findings: [] }) });
    expect(screen.getByText("Clean")).toBeInTheDocument();
  });

  test("shows pipeline count", () => {
    renderGroupCard();
    expect(screen.getByText("1 pipeline")).toBeInTheDocument();
  });

  test("shows No Pipelines badge when no pipeline references", () => {
    renderGroupCard({ group: makeGroup({ pipelineReferences: [] }) });
    expect(screen.getByText("No Pipelines")).toBeInTheDocument();
  });

  test("shows Key Vault badge for AzureKeyVault type", () => {
    renderGroupCard({ group: makeGroup({ type: "AzureKeyVault" }) });
    expect(screen.getByText("Key Vault")).toBeInTheDocument();
  });

  test("does not show findings table when collapsed", () => {
    renderGroupCard({ expanded: false });
    expect(screen.queryByText("Severity")).toBeNull();
  });

  test("shows findings table when expanded", () => {
    renderGroupCard({ expanded: true });
    expect(screen.getByText("Severity")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("Variable")).toBeInTheDocument();
  });

  test("shows empty message when expanded with no findings", () => {
    renderGroupCard({ expanded: true, group: makeGroup({ findings: [] }) });
    expect(screen.getByText("No findings for this group.")).toBeInTheDocument();
  });

  test("calls onToggle when header is clicked", () => {
    const onToggle = jest.fn();
    renderGroupCard({ onToggle });
    // Click on the group name area
    fireEvent.click(screen.getByText("TestGroup"));
    expect(onToggle).toHaveBeenCalled();
  });

  test("renders group checkbox for groups with findings", () => {
    renderGroupCard({ expanded: false });
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    // Should have at least one checkbox (the group select checkbox)
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  test("does not render group checkbox for KeyVault groups", () => {
    renderGroupCard({
      group: makeGroup({ type: "AzureKeyVault", findings: [makeFinding()] }),
    });
    // KeyVault groups should not have a group checkbox
    // But they may still have individual finding checkboxes in expanded mode
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(0);
  });
});
