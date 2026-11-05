import * as React from "react";
import { VariableGroupSummary, Severity, SecretFinding } from "../models/interfaces";
import { SEVERITY_TONE, SEVERITY_ORDER } from "../utils/constants";
import { IconChevronRight, Pill } from "./ui";
import { FindingRow } from "./FindingRow";

const findingKey = (f: SecretFinding) =>
  `${f.variableGroupId}::${f.variableName}::${f.patternName}::${f.matchSource}`;

export interface GroupCardProps {
  group: VariableGroupSummary;
  expanded: boolean;
  onToggle: () => void;
  filterSeverity: Severity | "all";
  onIgnoreFinding: (finding: SecretFinding) => void;
  onMarkAsSecret: (finding: SecretFinding) => void;
  selectedFindings: Set<string>;
  onSelectFinding: (finding: SecretFinding, selected: boolean) => void;
  onSelectGroup: (groupId: number, selected: boolean, visibleFindings: SecretFinding[]) => void;
  busy: boolean;
  orgUrl: string;
  projectName: string;
  ignoringFindingKey?: string | null;
}

/**
 * One variable group, rendered as a disclosure row. The header is a div (not a
 * button) because it hosts the group-select checkbox, and interactive content
 * inside a button is invalid HTML.
 */
export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  expanded,
  onToggle,
  filterSeverity,
  onIgnoreFinding,
  onMarkAsSecret,
  selectedFindings,
  onSelectFinding,
  onSelectGroup,
  busy,
  orgUrl,
  projectName,
  ignoringFindingKey,
}) => {
  const findings =
    filterSeverity === "all"
      ? group.findings
      : group.findings.filter((f) => f.severity === filterSeverity);

  const isKeyVault = group.type === "AzureKeyVault";
  const showGroupCheckbox = !isKeyVault && findings.length > 0;

  const libraryUrl =
    orgUrl && projectName
      ? `${orgUrl.replace(/\/$/, "")}/${encodeURIComponent(projectName)}/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=${group.id}`
      : "";

  const selectedCount = findings.filter((f) => selectedFindings.has(findingKey(f))).length;
  const allSelected = findings.length > 0 && selectedCount === findings.length;
  const someSelected = selectedCount > 0 && selectedCount < findings.length;

  const groupCheckboxRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (groupCheckboxRef.current) {
      groupCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const worstSeverity =
    findings.length > 0
      ? findings.reduce((worst, f) =>
          SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[worst.severity] ? f : worst
        ).severity
      : null;

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`ax-disclosure${expanded ? " ax-disclosure--open" : ""}`}>
      <div
        className="ax-disclosure__head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
      >
        {showGroupCheckbox && (
          <input
            ref={groupCheckboxRef}
            type="checkbox"
            className="ax-check"
            checked={allSelected}
            onChange={(e) => onSelectGroup(group.id, e.target.checked, findings)}
            onClick={(e) => e.stopPropagation()}
            title="Select all findings in this group"
            aria-label={`Select all findings in ${group.name}`}
          />
        )}
        <span className="ax-disclosure__chevron">
          <IconChevronRight />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{group.name}</span>
          {group.description && (
            <span className="ax-help" style={{ display: "block" }}>
              {group.description}
            </span>
          )}
        </span>
        <span className="ax-row" style={{ flexWrap: "nowrap" }}>
          <span className="ax-fine">
            {group.variableCount} vars | {group.secretCount} secret
          </span>
          {findings.length > 0 ? (
            <Pill tone={SEVERITY_TONE[worstSeverity!]}>
              {findings.length} {findings.length === 1 ? "finding" : "findings"}
            </Pill>
          ) : (
            <Pill tone="success">Clean</Pill>
          )}
          {isKeyVault && <Pill tone="accent">Key Vault</Pill>}
          {group.pipelineReferences.length === 0 ? (
            <Pill tone="warn">No Pipelines</Pill>
          ) : (
            <span
              className="ax-fine"
              title={group.pipelineReferences
                .map((r) => `${r.pipelineName} (${r.repoName})`)
                .join("\n")}
            >
              {group.pipelineReferences.length}{" "}
              {group.pipelineReferences.length === 1 ? "pipeline" : "pipelines"}
            </span>
          )}
        </span>
      </div>

      {expanded && findings.length > 0 && (
        <div className="ax-disclosure__body" style={{ padding: 0 }}>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <span className="ax-sr-only">Select</span>
                  </th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Variable</th>
                  <th>Matched On</th>
                  <th>Pattern</th>
                  <th>Value Preview</th>
                  <th style={{ width: 150 }}>
                    <span className="ax-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding, idx) => (
                  <FindingRow
                    key={`${finding.variableName}-${finding.patternName}-${idx}`}
                    finding={finding}
                    onIgnore={onIgnoreFinding}
                    onMarkAsSecret={isKeyVault ? undefined : onMarkAsSecret}
                    selected={selectedFindings.has(findingKey(finding))}
                    onSelect={onSelectFinding}
                    busy={busy}
                    libraryUrl={libraryUrl}
                    ignoring={ignoringFindingKey === findingKey(finding)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expanded && findings.length === 0 && (
        <div className="ax-disclosure__body">
          <p className="ax-help" style={{ margin: 0, textAlign: "center" }}>
            No findings for this group.
          </p>
        </div>
      )}
    </div>
  );
};
