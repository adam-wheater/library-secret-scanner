import * as React from "react";
import { Severity, Confidence, SecretFinding } from "../models/interfaces";
import { Button, IconDownload, IconSearch } from "./ui";

interface ScanToolbarProps {
  groupSearchTerm: string;
  onSearchChange: (term: string) => void;
  filterSeverity: Severity | "all";
  onFilterSeverityChange: (severity: Severity | "all") => void;
  filterConfidence: Confidence | "all";
  onFilterConfidenceChange: (confidence: Confidence | "all") => void;
  showCleanGroups: boolean;
  onShowCleanGroupsChange: (show: boolean) => void;
  showUnusedOnly: boolean;
  onShowUnusedOnlyChange: (show: boolean) => void;
  allVisibleFindings: SecretFinding[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  selectedCount: number;
  onBulkIgnore: () => void;
  onBulkMarkAsSecret: () => void;
  markingAsSecret: boolean;
  bulkIgnoring: boolean;
  totalFindings: number;
  onExportCsv: () => void;
}

export const ScanToolbar: React.FC<ScanToolbarProps> = ({
  groupSearchTerm,
  onSearchChange,
  filterSeverity,
  onFilterSeverityChange,
  filterConfidence,
  onFilterConfidenceChange,
  showCleanGroups,
  onShowCleanGroupsChange,
  showUnusedOnly,
  onShowUnusedOnlyChange,
  allVisibleFindings,
  allVisibleSelected,
  someVisibleSelected,
  onSelectAll,
  onExpandAll,
  onCollapseAll,
  selectedCount,
  onBulkIgnore,
  onBulkMarkAsSecret,
  markingAsSecret,
  bulkIgnoring,
  totalFindings,
  onExportCsv,
}) => {
  const selectAllRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const bulkBusy = markingAsSecret || bulkIgnoring;

  return (
    <div className="ax-toolbar">
      <div className="ax-search">
        <span className="ax-search__icon">
          <IconSearch />
        </span>
        <input
          type="text"
          className="ax-input"
          placeholder="Search groups by name..."
          aria-label="Search groups by name"
          value={groupSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <label className="ax-field ax-field--inline" style={{ marginBottom: 0 }}>
        <span className="ax-label">Severity:</span>
        <select
          className="ax-select"
          value={filterSeverity}
          onChange={(e) => onFilterSeverityChange(e.target.value as Severity | "all")}
        >
          <option value="all">All</option>
          <option value={Severity.Critical}>Critical</option>
          <option value={Severity.High}>High</option>
          <option value={Severity.Medium}>Medium</option>
          <option value={Severity.Low}>Low</option>
        </select>
      </label>
      <label className="ax-field ax-field--inline" style={{ marginBottom: 0 }}>
        <span className="ax-label">Confidence:</span>
        <select
          className="ax-select"
          value={filterConfidence}
          onChange={(e) => onFilterConfidenceChange(e.target.value as Confidence | "all")}
        >
          <option value="all">All</option>
          <option value={Confidence.High}>High</option>
          <option value={Confidence.Medium}>Medium</option>
          <option value={Confidence.Low}>Low</option>
        </select>
      </label>
      <label className="ax-check">
        <input
          type="checkbox"
          checked={showCleanGroups}
          onChange={(e) => onShowCleanGroupsChange(e.target.checked)}
        />
        Show clean groups
      </label>
      <label className="ax-check">
        <input
          type="checkbox"
          checked={showUnusedOnly}
          onChange={(e) => onShowUnusedOnlyChange(e.target.checked)}
        />
        Unused only
      </label>
      {allVisibleFindings.length > 0 && (
        <label className="ax-check">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          Select all ({allVisibleFindings.length})
        </label>
      )}
      <div className="ax-toolbar__group">
        <Button size="sm" onClick={onExpandAll}>
          Expand All
        </Button>
        <Button size="sm" onClick={onCollapseAll}>
          Collapse All
        </Button>
      </div>
      {selectedCount > 0 && (
        <div className="ax-toolbar__group">
          <Button size="sm" variant="primary" onClick={onBulkIgnore} disabled={bulkBusy}>
            {bulkIgnoring ? "Ignoring..." : `Ignore Selected (${selectedCount})`}
          </Button>
          <Button size="sm" variant="danger" onClick={onBulkMarkAsSecret} disabled={bulkBusy}>
            {markingAsSecret ? "Marking..." : `Mark as Secret (${selectedCount})`}
          </Button>
        </div>
      )}
      {totalFindings > 0 && (
        <>
          <span className="ax-spacer" />
          <Button size="sm" icon={<IconDownload />} onClick={onExportCsv}>
            Export CSV
          </Button>
        </>
      )}
    </div>
  );
};
