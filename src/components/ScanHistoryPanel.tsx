import * as React from "react";
import { ScanHistoryEntry } from "../models/interfaces";
import { useTheme } from "../utils/theme";
import { Card, EmptyState, Pill } from "./ui";

interface ScanHistoryPanelProps {
  entries: ScanHistoryEntry[];
}

/**
 * An entry recorded with no previous scan to compare against has no delta
 * fields at all. History is capped, so "oldest retained" is not "first scan".
 */
const isFirstScan = (entry: ScanHistoryEntry) =>
  entry.newFindings === undefined && entry.resolvedFindings === undefined;

export const ScanHistoryPanel: React.FC<ScanHistoryPanelProps> = ({ entries }) => {
  const theme = useTheme();

  return (
    <Card
      title="Scan History"
      hint={`Last ${entries.length} scan(s). Deltas show changes compared to the previous scan.`}
      flush
    >
      {entries.length === 0 ? (
        <EmptyState title="No scan history yet. Run a scan to start tracking results over time." />
      ) : (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="ax-num">Groups</th>
                <th className="ax-num">Variables</th>
                <th className="ax-num">Already Secret</th>
                <th className="ax-num">Findings</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.scannedAt).toLocaleString()}</td>
                  <td className="ax-num">{entry.totalGroups}</td>
                  <td className="ax-num">{entry.totalVariables}</td>
                  <td className="ax-num" style={{ color: theme.successText }}>
                    {entry.totalAlreadySecret}
                  </td>
                  <td
                    className="ax-num"
                    style={{
                      color: entry.totalFindings > 0 ? theme.errorText : theme.successText,
                      fontWeight: 600,
                    }}
                  >
                    {entry.totalFindings}
                  </td>
                  <td>
                    {isFirstScan(entry) ? (
                      <span className="ax-fine">First scan</span>
                    ) : (
                      <span className="ax-row">
                        {(entry.newFindings ?? 0) > 0 && (
                          <Pill tone="danger">+{entry.newFindings} new</Pill>
                        )}
                        {(entry.resolvedFindings ?? 0) > 0 && (
                          <Pill tone="success">-{entry.resolvedFindings} resolved</Pill>
                        )}
                        {(entry.newFindings ?? 0) === 0 && (entry.resolvedFindings ?? 0) === 0 && (
                          <span className="ax-fine">No change</span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
