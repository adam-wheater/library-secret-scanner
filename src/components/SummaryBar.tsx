import * as React from "react";
import { ScanResult, Severity } from "../models/interfaces";
import { Metric } from "./ui";

export const SummaryBar: React.FC<{
  result: ScanResult;
  ignoredCount: number;
}> = ({ result, ignoredCount }) => {
  const criticalCount = result.groups.reduce(
    (sum, g) => sum + g.findings.filter((f) => f.severity === Severity.Critical).length,
    0
  );
  const highCount = result.groups.reduce(
    (sum, g) => sum + g.findings.filter((f) => f.severity === Severity.High).length,
    0
  );
  const unusedCount = result.groups.filter((g) => g.pipelineReferences.length === 0).length;

  return (
    <div className="ax-metrics" data-testid="summary-bar">
      <Metric
        label="Variable Groups"
        value={result.groups.length}
        hint={`Scanned at ${result.scannedAt.toLocaleTimeString()}`}
      />
      <Metric label="Total Variables" value={result.totalVariables} />
      <Metric label="Already Secret" value={result.totalAlreadySecret} tone="success" />
      <Metric
        label="Findings"
        value={result.totalFindings}
        tone={result.totalFindings > 0 ? "danger" : "success"}
        hint={result.totalFindings > 0 ? "should be marked as secret" : "all groups look clean"}
      />
      {criticalCount > 0 && <Metric label="Critical" value={criticalCount} tone="danger" />}
      {highCount > 0 && <Metric label="High" value={highCount} tone="warn" />}
      {unusedCount > 0 && (
        <Metric
          label="No Pipelines"
          value={unusedCount}
          tone="warn"
          hint="groups not referenced by any pipeline"
        />
      )}
      {ignoredCount > 0 && (
        <Metric label="Ignored" value={ignoredCount} hint="hidden by the ignore list" />
      )}
    </div>
  );
};
