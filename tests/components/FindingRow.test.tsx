import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FindingRow } from "../../src/components/FindingRow";
import { SecretFinding, Severity, MatchSource, Confidence } from "../../src/models/interfaces";

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

function renderRow(props: Partial<React.ComponentProps<typeof FindingRow>> = {}) {
  const defaultProps = {
    finding: makeFinding(),
    onIgnore: jest.fn(),
    onMarkAsSecret: jest.fn(),
    selected: false,
    onSelect: jest.fn(),
    busy: false,
    libraryUrl: "https://dev.azure.com/org/proj/_library",
    ignoring: false,
  };
  return render(
    <table>
      <tbody>
        <FindingRow {...defaultProps} {...props} />
      </tbody>
    </table>
  );
}

describe("FindingRow", () => {
  test("renders the variable name", () => {
    renderRow();
    expect(screen.getByText("DbPassword")).toBeInTheDocument();
  });

  test("renders the severity badge", () => {
    renderRow();
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  test("renders the confidence badge", () => {
    renderRow();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  test("masks the value preview", () => {
    renderRow();
    // "supersecretvalue123" is 19 characters: only the first four survive.
    expect(screen.getByText("supe****")).toBeInTheDocument();
  });

  test("shows no characters of a value under 16 characters", () => {
    // The old rule kept four at each end of anything over 8, so a 9-character
    // password showed 8 of its 9 characters.
    renderRow({ finding: makeFinding({ variableValue: "Passw0rd!" }) });
    expect(screen.getByText("****")).toBeInTheDocument();
    expect(screen.queryByText(/Passw0/)).toBeNull();
  });

  test("shows **** for short values", () => {
    renderRow({ finding: makeFinding({ variableValue: "short" }) });
    expect(screen.getByText("****")).toBeInTheDocument();
  });

  test("renders Ignore button", () => {
    renderRow();
    expect(screen.getByText("Ignore")).toBeInTheDocument();
  });

  test("renders Secret button when onMarkAsSecret is provided", () => {
    renderRow();
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  test("does not render Secret button when onMarkAsSecret is undefined", () => {
    renderRow({ onMarkAsSecret: undefined });
    expect(screen.queryByText("Secret")).toBeNull();
  });

  test("calls onIgnore when Ignore button is clicked", () => {
    const onIgnore = jest.fn();
    renderRow({ onIgnore });
    fireEvent.click(screen.getByText("Ignore"));
    expect(onIgnore).toHaveBeenCalledWith(expect.objectContaining({ variableName: "DbPassword" }));
  });

  test("calls onMarkAsSecret when Secret button is clicked", () => {
    const onMarkAsSecret = jest.fn();
    renderRow({ onMarkAsSecret });
    fireEvent.click(screen.getByText("Secret"));
    expect(onMarkAsSecret).toHaveBeenCalledWith(
      expect.objectContaining({ variableName: "DbPassword" })
    );
  });

  test("calls onSelect when checkbox is changed", () => {
    const onSelect = jest.fn();
    renderRow({ onSelect });
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onSelect).toHaveBeenCalled();
  });

  test("disables buttons when busy", () => {
    renderRow({ busy: true });
    const ignoreBtn = screen.getByText("Ignore");
    expect(ignoreBtn).toBeDisabled();
    const secretBtn = screen.getByText("Secret");
    expect(secretBtn).toBeDisabled();
  });

  test("shows ... when ignoring", () => {
    renderRow({ ignoring: true });
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  test("displays Name for VariableName match source", () => {
    renderRow({ finding: makeFinding({ matchSource: MatchSource.VariableName }) });
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  test("displays Value for VariableValue match source", () => {
    renderRow({ finding: makeFinding({ matchSource: MatchSource.VariableValue }) });
    expect(screen.getByText("Value")).toBeInTheDocument();
  });
});
