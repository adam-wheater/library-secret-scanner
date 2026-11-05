import * as React from "react";
import { IgnoreEntry } from "../models/interfaces";
import { useTheme } from "../utils/theme";
import { formatError } from "../utils/formatError";
import { Banner, Button, Card, ConfirmDialog, EmptyState, IconSearch, IconTrash } from "./ui";

interface IgnoreListPanelProps {
  entries: IgnoreEntry[];
  onRemove: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
}

function isExpired(entry: IgnoreEntry): boolean {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt) <= new Date();
}

export const IgnoreListPanel: React.FC<IgnoreListPanelProps> = ({ entries, onRemove, onClear }) => {
  const theme = useTheme();
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleRestore = React.useCallback(
    async (id: string) => {
      try {
        await onRemove(id);
      } catch (e) {
        setActionError(formatError(e));
      }
    },
    [onRemove]
  );

  const handleClear = React.useCallback(async () => {
    try {
      await onClear();
      setConfirmClear(false);
    } catch (e) {
      setConfirmClear(false);
      setActionError(formatError(e));
    }
  }, [onClear]);

  const filtered = React.useMemo(() => {
    const s = [...entries].sort((a, b) => b.ignoredAt.localeCompare(a.ignoredAt));
    if (!searchTerm.trim()) return s;
    const lower = searchTerm.toLowerCase();
    return s.filter(
      (e) =>
        e.variableGroupName.toLowerCase().includes(lower) ||
        e.variableName.toLowerCase().includes(lower) ||
        e.patternName.toLowerCase().includes(lower) ||
        (e.reason && e.reason.toLowerCase().includes(lower))
    );
  }, [entries, searchTerm]);

  return (
    <Card
      title="Ignored Findings"
      hint="Findings dismissed as false positives. Restore them to include them in future scans."
      actions={
        entries.length > 0 ? (
          <Button icon={<IconTrash />} onClick={() => setConfirmClear(true)}>
            Clear All
          </Button>
        ) : undefined
      }
    >
      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear ignore list"
        message={`Clear all ${entries.length} entries? Every ignored finding will show up again on the next scan.`}
        confirmLabel="Yes, clear"
        danger
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />

      {actionError && (
        <Banner tone="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Banner>
      )}

      {entries.length > 0 && (
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
              placeholder="Search by group, variable, pattern, or reason..."
              aria-label="Search ignored findings"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            searchTerm.trim()
              ? "No entries match your search."
              : "No findings have been dismissed. Use the ignore button on scan results to dismiss false positives."
          }
        />
      ) : (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Variable Group</th>
                <th>Variable</th>
                <th>Pattern</th>
                <th>Reason</th>
                <th>Ignored At</th>
                <th>Expires</th>
                <th>
                  <span className="ax-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const expired = isExpired(entry);
                return (
                  <tr key={entry.id} style={expired ? { opacity: 0.6 } : undefined}>
                    <td>{entry.variableGroupName}</td>
                    <td className="ax-mono">{entry.variableName}</td>
                    <td>{entry.patternName}</td>
                    <td className="ax-muted">{entry.reason || "—"}</td>
                    <td className="ax-muted">{new Date(entry.ignoredAt).toLocaleDateString()}</td>
                    <td
                      className={expired ? undefined : "ax-muted"}
                      style={expired ? { color: theme.errorText } : undefined}
                    >
                      {entry.expiresAt
                        ? expired
                          ? `Expired ${new Date(entry.expiresAt).toLocaleDateString()}`
                          : new Date(entry.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td>
                      <Button size="sm" onClick={() => handleRestore(entry.id)}>
                        Restore
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
