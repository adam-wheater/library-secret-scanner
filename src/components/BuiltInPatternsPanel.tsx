import * as React from "react";
import { Severity, BuiltInPatternOverride } from "../models/interfaces";
import { SecretPattern, NAME_PATTERNS, VALUE_PATTERNS } from "../utils/constants";
import { useTheme } from "../utils/theme";
import { formatError } from "../utils/formatError";
import { Banner, Button, Card, IconSearch, Pill } from "./ui";

interface BuiltInPatternsPanelProps {
  overrides: BuiltInPatternOverride[];
  onSave: (overrides: BuiltInPatternOverride[]) => Promise<void>;
}

interface PatternRow {
  pattern: SecretPattern;
  target: "Name" | "Value";
  defaultSeverity: Severity;
  enabled: boolean;
  severity: Severity;
  order: number;
}

function buildRows(overrides: BuiltInPatternOverride[]): PatternRow[] {
  const overrideMap = new Map(overrides.map((o) => [o.patternName, o]));

  const all: PatternRow[] = [];
  let idx = 0;

  for (const p of NAME_PATTERNS) {
    const o = overrideMap.get(p.name);
    all.push({
      pattern: p,
      target: "Name",
      defaultSeverity: p.severity,
      enabled: o ? o.enabled : true,
      severity: o?.severity ?? p.severity,
      order: o?.order ?? idx,
    });
    idx++;
  }

  for (const p of VALUE_PATTERNS) {
    const o = overrideMap.get(p.name);
    all.push({
      pattern: p,
      target: "Value",
      defaultSeverity: p.severity,
      enabled: o ? o.enabled : true,
      severity: o?.severity ?? p.severity,
      order: o?.order ?? idx,
    });
    idx++;
  }

  all.sort((a, b) => a.order - b.order);
  return all;
}

function rowsToOverrides(rows: PatternRow[]): BuiltInPatternOverride[] {
  const overrides: BuiltInPatternOverride[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isModified =
      !r.enabled || r.severity !== r.defaultSeverity || i !== defaultIndexOf(r.pattern.name);
    if (isModified) {
      overrides.push({
        patternName: r.pattern.name,
        enabled: r.enabled,
        severity: r.severity !== r.defaultSeverity ? r.severity : undefined,
        order: i,
      });
    }
  }
  return overrides;
}

const defaultOrderMap = new Map<string, number>();
let _idx = 0;
for (const p of NAME_PATTERNS) {
  defaultOrderMap.set(p.name, _idx++);
}
for (const p of VALUE_PATTERNS) {
  defaultOrderMap.set(p.name, _idx++);
}

function defaultIndexOf(name: string): number {
  return defaultOrderMap.get(name) ?? 9999;
}

export const BuiltInPatternsPanel: React.FC<BuiltInPatternsPanelProps> = ({
  overrides,
  onSave,
}) => {
  const theme = useTheme();
  const [rows, setRows] = React.useState<PatternRow[]>(() => buildRows(overrides));
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    setRows(buildRows(overrides));
    setDirty(false);
  }, [overrides]);

  const handleToggle = React.useCallback((name: string) => {
    setRows((prev) =>
      prev.map((r) => (r.pattern.name === name ? { ...r, enabled: !r.enabled } : r))
    );
    setDirty(true);
  }, []);

  const handleSeverityChange = React.useCallback((name: string, severity: Severity) => {
    setRows((prev) => prev.map((r) => (r.pattern.name === name ? { ...r, severity } : r)));
    setDirty(true);
  }, []);

  const handleMove = React.useCallback((name: string, direction: -1 | 1) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.pattern.name === name);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((r, i) => ({ ...r, order: i }));
    });
    setDirty(true);
  }, []);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setActionError(null);
    try {
      await onSave(rowsToOverrides(rows));
      setDirty(false);
    } catch (e) {
      setActionError(formatError(e));
    } finally {
      setSaving(false);
    }
  }, [rows, onSave]);

  const handleReset = React.useCallback(async () => {
    setSaving(true);
    setActionError(null);
    try {
      await onSave([]);
      setDirty(false);
    } catch (e) {
      setActionError(formatError(e));
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const overrideCount = React.useMemo(() => rowsToOverrides(rows).length, [rows]);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const lower = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.pattern.name.toLowerCase().includes(lower) ||
        r.pattern.description.toLowerCase().includes(lower)
    );
  }, [rows, searchTerm]);

  const reorderLocked = !!searchTerm.trim();

  return (
    <Card
      title="Built-in Rules"
      hint={`${NAME_PATTERNS.length + VALUE_PATTERNS.length} patterns.${
        overrideCount > 0 ? ` ${overrideCount} customised.` : " All using defaults."
      }`}
      actions={
        <>
          {overrideCount > 0 && (
            <Button onClick={handleReset} disabled={saving}>
              Reset to Defaults
            </Button>
          )}
          {dirty && (
            <Button variant="primary" onClick={handleSave} busy={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </>
      }
    >
      {actionError && (
        <Banner tone="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Banner>
      )}

      <div className="ax-toolbar">
        <div className="ax-search" style={{ flex: 1 }}>
          <span className="ax-search__icon">
            <IconSearch />
          </span>
          <input
            type="text"
            className="ax-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules by name or description..."
            aria-label="Search rules by name or description"
          />
        </div>
        {reorderLocked && <span className="ax-help">Clear the search to reorder rules.</span>}
      </div>

      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>On</th>
              <th className="ax-num" style={{ width: 40 }}>
                #
              </th>
              <th>Name</th>
              <th>Target</th>
              <th>Regex</th>
              <th style={{ width: 120 }}>Severity</th>
              <th style={{ width: 90 }}>Order</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const globalIdx = rows.indexOf(row);
              const isModified =
                !row.enabled ||
                row.severity !== row.defaultSeverity ||
                globalIdx !== defaultIndexOf(row.pattern.name);
              return (
                <tr
                  key={row.pattern.name}
                  style={isModified ? { background: theme.warningBg } : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="ax-check"
                      checked={row.enabled}
                      onChange={() => handleToggle(row.pattern.name)}
                      aria-label={`Enable ${row.pattern.name}`}
                    />
                  </td>
                  <td className="ax-num ax-muted">{globalIdx + 1}</td>
                  <td>
                    <div className="ax-row" style={{ flexWrap: "nowrap" }}>
                      <span style={{ fontWeight: 600 }}>{row.pattern.name}</span>
                      {!row.enabled && <Pill tone="neutral">Off</Pill>}
                      {isModified && row.enabled && <Pill tone="warn">Customised</Pill>}
                    </div>
                    <div className="ax-help">{row.pattern.description}</div>
                  </td>
                  <td>{row.target}</td>
                  <td className="ax-mono ax-muted ax-truncate" style={{ maxWidth: 260 }}>
                    {row.target === "Name"
                      ? (row.pattern.namePattern?.source ?? "")
                      : (row.pattern.valuePattern?.source ?? "")}
                  </td>
                  <td>
                    <select
                      className="ax-select ax-input--sm"
                      value={row.severity}
                      onChange={(e) =>
                        handleSeverityChange(row.pattern.name, e.target.value as Severity)
                      }
                      aria-label={`Severity for ${row.pattern.name}`}
                    >
                      <option value={Severity.Critical}>Critical</option>
                      <option value={Severity.High}>High</option>
                      <option value={Severity.Medium}>Medium</option>
                      <option value={Severity.Low}>Low</option>
                    </select>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="ax-row" style={{ flexWrap: "nowrap", gap: 4 }}>
                      <Button
                        size="sm"
                        onClick={() => handleMove(row.pattern.name, -1)}
                        disabled={globalIdx === 0 || reorderLocked}
                        title="Move up (higher priority)"
                        aria-label={`Move ${row.pattern.name} up`}
                      >
                        ▲
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMove(row.pattern.name, 1)}
                        disabled={globalIdx === rows.length - 1 || reorderLocked}
                        title="Move down (lower priority)"
                        aria-label={`Move ${row.pattern.name} down`}
                      >
                        ▼
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
