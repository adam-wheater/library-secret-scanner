export enum Severity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum MatchSource {
  VariableName = "variable-name",
  VariableValue = "variable-value",
}

export enum Confidence {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export interface SecretFinding {
  variableGroupId: number;
  variableGroupName: string;
  variableName: string;
  /** The plaintext value — only present for non-secret variables. */
  variableValue: string;
  isAlreadySecret: boolean;
  severity: Severity;
  matchSource: MatchSource;
  patternName: string;
  description: string;
  confidence: Confidence;
}

export interface PipelineRef {
  pipelineName: string;
  repoName: string;
}

export interface VariableGroupSummary {
  id: number;
  name: string;
  description: string;
  type: string;
  variableCount: number;
  secretCount: number;
  findings: SecretFinding[];
  pipelineReferences: PipelineRef[];
}

export interface ScanResult {
  groups: VariableGroupSummary[];
  totalVariables: number;
  totalAlreadySecret: number;
  totalFindings: number;
  scannedAt: Date;
}

export interface ScanProgress {
  phase: string;
  current: number;
  total: number;
}

export interface CustomPatternDefinition {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  matchTarget: MatchSource;
  regexSource: string;
  regexFlags: string;
  enabled: boolean;
  createdAt: string;
}

export interface IgnoreEntry {
  id: string;
  variableGroupId: number;
  variableGroupName: string;
  variableName: string;
  patternName: string;
  reason: string;
  ignoredAt: string;
  ignoredBy: string;
  /** Optional ISO date string. When set, the ignore entry expires after this date. */
  expiresAt?: string;
}

export interface CustomPatternsDocument {
  id: string;
  patterns: CustomPatternDefinition[];
  version: number;
}

export interface IgnoreListDocument {
  id: string;
  entries: IgnoreEntry[];
  version: number;
}

export interface BuiltInPatternOverride {
  patternName: string;
  enabled: boolean;
  severity?: Severity;
  order?: number;
}

export interface BuiltInPatternOverridesDocument {
  id: string;
  overrides: BuiltInPatternOverride[];
  version: number;
}

// --- Scan History ---

export interface ScanHistoryEntry {
  id: string;
  scannedAt: string;
  totalGroups: number;
  totalVariables: number;
  totalAlreadySecret: number;
  totalFindings: number;
  findingsByRepo: Record<string, number>;
  /** Comparison with the previous scan */
  newFindings?: number;
  resolvedFindings?: number;
}

export interface ScanHistoryDocument {
  id: string;
  entries: ScanHistoryEntry[];
  version: number;
}

// --- Project-Scoped Settings ---

export interface ProjectSettingsDocument {
  id: string;
  projectId: string;
  ignoreEntries: IgnoreEntry[];
  customPatterns: CustomPatternDefinition[];
  builtInOverrides: BuiltInPatternOverride[];
  inheritOrgDefaults: boolean;
  version: number;
}
