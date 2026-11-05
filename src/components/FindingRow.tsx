import * as React from "react";
import { SecretFinding, MatchSource } from "../models/interfaces";
import { SEVERITY_TONE, CONFIDENCE_TONE } from "../utils/constants";
import { Button, Pill } from "./ui";

/**
 * Preview of a flagged value for the table and the CSV export. Only a long
 * value keeps its first four characters, which is enough to tell a token's
 * type (AKIA, ghp_, xoxb) apart; anything shorter shows no characters at all,
 * because four of a short secret is a real share of it.
 */
export const maskValue = (value: string): string =>
  value.length >= 16 ? `${value.slice(0, 4)}****` : "****";

export interface FindingRowProps {
  finding: SecretFinding;
  onIgnore: (finding: SecretFinding) => void;
  onMarkAsSecret?: (finding: SecretFinding) => void;
  selected: boolean;
  onSelect: (finding: SecretFinding, selected: boolean) => void;
  busy: boolean;
  libraryUrl: string;
  ignoring?: boolean;
}

export const FindingRow: React.FC<FindingRowProps> = ({
  finding,
  onIgnore,
  onMarkAsSecret,
  selected,
  onSelect,
  busy,
  libraryUrl,
  ignoring = false,
}) => {
  const masked = maskValue(finding.variableValue);

  const handleIgnore = React.useCallback(() => {
    onIgnore(finding);
  }, [finding, onIgnore]);

  const handleMarkAsSecret = React.useCallback(() => {
    if (onMarkAsSecret) {
      onMarkAsSecret(finding);
    }
  }, [finding, onMarkAsSecret]);

  const handleRowClick = React.useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      if (libraryUrl) {
        window.open(libraryUrl, "_blank", "noopener");
      }
    },
    [libraryUrl]
  );

  return (
    <tr
      onClick={handleRowClick}
      style={libraryUrl ? { cursor: "pointer" } : undefined}
      title={libraryUrl ? "Open this variable group in the Library" : undefined}
    >
      <td>
        <input
          type="checkbox"
          className="ax-check"
          checked={selected}
          onChange={(e) => onSelect(finding, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select finding ${finding.variableName}`}
        />
      </td>
      <td>
        <Pill tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Pill>
      </td>
      <td>
        {finding.confidence && (
          <Pill
            tone={CONFIDENCE_TONE[finding.confidence] ?? "neutral"}
            title={`Confidence: ${finding.confidence}`}
          >
            {finding.confidence}
          </Pill>
        )}
      </td>
      <td className="ax-mono">{finding.variableName}</td>
      <td>{finding.matchSource === MatchSource.VariableName ? "Name" : "Value"}</td>
      <td>{finding.description}</td>
      <td className="ax-mono ax-muted">{masked}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        <div className="ax-row" style={{ flexWrap: "nowrap" }}>
          <Button
            size="sm"
            onClick={handleIgnore}
            disabled={ignoring || busy}
            title="Dismiss as false positive"
          >
            {ignoring ? "..." : "Ignore"}
          </Button>
          {onMarkAsSecret && (
            <Button
              size="sm"
              variant="danger"
              onClick={handleMarkAsSecret}
              disabled={busy}
              title="Mark this variable as secret in Azure DevOps"
            >
              Secret
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};
