import * as React from "react";
import { Tabs } from "./ui";

export type ViewMode = "scan" | "rules" | "patterns" | "ignorelist" | "history";

interface SettingsToolbarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  builtInOverrideCount: number;
  patternCount: number;
  ignoreCount: number;
  historyCount: number;
}

const countOrUndefined = (n: number) => (n > 0 ? n : undefined);

export const SettingsToolbar: React.FC<SettingsToolbarProps> = ({
  activeView,
  onViewChange,
  builtInOverrideCount,
  patternCount,
  ignoreCount,
  historyCount,
}) => (
  <Tabs
    aria-label="Views"
    active={activeView}
    onChange={(id) => onViewChange(id as ViewMode)}
    tabs={[
      { id: "scan", label: "Scan Results" },
      { id: "rules", label: "Built-in Rules", count: countOrUndefined(builtInOverrideCount) },
      { id: "patterns", label: "Custom Patterns", count: countOrUndefined(patternCount) },
      { id: "ignorelist", label: "Ignore List", count: countOrUndefined(ignoreCount) },
      { id: "history", label: "History", count: countOrUndefined(historyCount) },
    ]}
  />
);
