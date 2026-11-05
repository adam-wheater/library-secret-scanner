import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock azure-devops-extension-sdk
jest.mock("azure-devops-extension-sdk", () => ({
  getService: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  getExtensionContext: jest.fn().mockReturnValue({ id: "mock-id" }),
  init: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
}));

// Mock azure-devops-extension-api
jest.mock("azure-devops-extension-api", () => ({
  CommonServiceIds: {
    ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
    ExtensionDataService: "ms.vss-features.extension-data-service",
    LocationService: "ms.vss-features.location-service",
  },
  getClient: jest.fn().mockReturnValue({}),
}));

// Mock useScannerSettings
jest.mock("../../src/hooks/useScannerSettings", () => ({
  useScannerSettings: () => ({
    loading: false,
    error: null,
    customPatterns: [],
    addPattern: jest.fn(),
    updatePattern: jest.fn(),
    removePattern: jest.fn(),
    ignoreEntries: [],
    addIgnoreEntry: jest.fn(),
    addIgnoreEntries: jest.fn(),
    removeIgnoreEntry: jest.fn(),
    clearIgnoreList: jest.fn(),
    builtInOverrides: [],
    saveBuiltInOverrides: jest.fn(),
    scanHistory: [],
    addScanHistoryEntry: jest.fn(),
    reload: jest.fn(),
  }),
}));

// Mock scanning modules
jest.mock("../../src/scanning/LibraryGroupService", () => ({
  getVariableGroups: jest.fn().mockResolvedValue([]),
  extractVariables: jest.fn().mockReturnValue([]),
  getGroupMetadata: jest.fn().mockReturnValue({
    id: 1,
    name: "G",
    description: "",
    type: "Vsts",
    variableCount: 0,
    secretCount: 0,
  }),
  markVariablesAsSecret: jest.fn().mockResolvedValue({ updated: [], notFound: [] }),
  getPipelineVariableGroupUsage: jest.fn().mockResolvedValue(new Map()),
  detectSecretVariableGroupReferences: jest.fn().mockReturnValue([]),
}));

jest.mock("../../src/scanning/SecretPatternMatcher", () => ({
  scanVariablesWithCustomPatterns: jest.fn().mockReturnValue([]),
  compileCustomPatterns: jest.fn().mockReturnValue({ namePatterns: [], valuePatterns: [] }),
  filterIgnoredFindings: jest.fn().mockReturnValue([]),
}));

import { App } from "../../src/components/App";

describe("App", () => {
  test("renders the main heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Library Secret Scanner" })
    ).toBeInTheDocument();
  });

  test("renders the scan button", () => {
    render(<App />);
    const buttons = screen.getAllByText("Scan Library Groups");
    // There should be at least one button with this text
    const scanButton = buttons.find((el: HTMLElement) => el.tagName === "BUTTON");
    expect(scanButton).toBeTruthy();
  });

  test("renders the subtitle description", () => {
    render(<App />);
    expect(
      screen.getByText("Find variable group values that should be secrets")
    ).toBeInTheDocument();
  });

  test("renders the settings toolbar tabs", () => {
    render(<App />);
    expect(screen.getByText("Scan Results")).toBeInTheDocument();
    expect(screen.getByText("Built-in Rules")).toBeInTheDocument();
    expect(screen.getByText("Custom Patterns")).toBeInTheDocument();
    expect(screen.getByText("Ignore List")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  test("renders the initial empty state prompt", () => {
    render(<App />);
    expect(screen.getByText(/Click/)).toBeInTheDocument();
    // "Scan Library Groups" appears both as button and <strong> in prompt
    const allInstances = screen.getAllByText(/Scan Library Groups/);
    expect(allInstances.length).toBeGreaterThanOrEqual(2);
  });

  test("scan button is enabled when not loading", () => {
    render(<App />);
    const buttons = screen.getAllByText("Scan Library Groups");
    const scanButton = buttons.find((el: HTMLElement) => el.tagName === "BUTTON");
    expect(scanButton).toBeTruthy();
    expect(scanButton).not.toBeDisabled();
  });
});
