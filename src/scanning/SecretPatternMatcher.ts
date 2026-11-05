import {
  SecretFinding,
  MatchSource,
  Confidence,
  CustomPatternDefinition,
  IgnoreEntry,
  BuiltInPatternOverride,
} from "../models/interfaces";
import {
  SecretPattern,
  NAME_PATTERNS,
  VALUE_PATTERNS,
  SEVERITY_ORDER,
  isLikelyFalsePositive,
  HIGH_CONFIDENCE_NAME_HINTS,
} from "../utils/constants";

export interface VariableEntry {
  name: string;
  value: string;
  isSecret: boolean;
}

export interface MatchResult {
  findings: SecretFinding[];
}

// --- Enhancement #12: Confidence scoring ---

/**
 * Calculate Shannon entropy for a string.
 * Higher entropy indicates more randomness, which is typical for secrets.
 */
export function calculateEntropy(value: string): number {
  if (!value || value.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const ch of value) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }

  let entropy = 0;
  const len = value.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Determine the confidence level for a finding based on:
 * - Pattern specificity (high-specificity patterns => High confidence)
 * - Entropy of the matched value
 * - Context: whether the variable name suggests a secret
 */
export function computeConfidence(
  variableName: string,
  variableValue: string,
  matchSource: MatchSource,
  patternName: string
): Confidence {
  // High-specificity value patterns always get high confidence
  const highSpecificityPatterns = new Set([
    "connection-string-value",
    "azure-storage-key",
    "sas-token",
    "jwt-token",
    "private-key-block",
    "basic-auth-url",
    "aws-key-pattern",
    "github-token",
    "npm-token",
    "sendgrid-key",
    "twilio-key",
    "google-cloud-api-key",
    "stripe-secret-key",
    "hashicorp-vault-token",
    "slack-bot-token",
    "slack-user-token",
    "slack-session-token",
    "twilio-api-key",
    "sendgrid-api-key",
    "slack-webhook",
  ]);

  if (highSpecificityPatterns.has(patternName)) {
    return Confidence.High;
  }

  // Name-based patterns: check if the name strongly hints at a secret
  if (matchSource === MatchSource.VariableName) {
    const isStrongNameHint = HIGH_CONFIDENCE_NAME_HINTS.some((p) => p.test(variableName));
    if (isStrongNameHint) return Confidence.High;
    return Confidence.Medium;
  }

  // Value-based patterns: use entropy and name context
  const entropy = calculateEntropy(variableValue);
  const nameHint = HIGH_CONFIDENCE_NAME_HINTS.some((p) => p.test(variableName));

  if (entropy >= 4.0 && nameHint) return Confidence.High;
  if (entropy >= 4.0 || nameHint) return Confidence.Medium;
  return Confidence.Low;
}

/**
 * Scans a variable against all built-in secret patterns and returns any matches.
 * Variables already marked as secret are skipped — their values are masked by
 * Azure DevOps and there's nothing to flag.
 */
export function matchVariable(
  variable: VariableEntry,
  groupId: number,
  groupName: string
): SecretFinding[] {
  return matchVariableWithPatterns(variable, groupId, groupName, NAME_PATTERNS, VALUE_PATTERNS);
}

/**
 * Scans all variables in a group and returns de-duplicated findings sorted
 * by severity (critical first).
 */
export function scanVariables(
  variables: VariableEntry[],
  groupId: number,
  groupName: string
): SecretFinding[] {
  const allFindings: SecretFinding[] = [];

  for (const variable of variables) {
    const findings = matchVariable(variable, groupId, groupName);
    allFindings.push(...findings);
  }

  // De-duplicate: keep only the highest-severity finding per variable+source
  const deduped = deduplicateFindings(allFindings);

  // Sort by severity (critical first), then by variable name
  deduped.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.variableName.localeCompare(b.variableName);
  });

  return deduped;
}

/**
 * For a given variable, keep all unique pattern matches — but if the same
 * pattern name fires on the same variable, only keep the highest severity one.
 */
export function deduplicateFindings(findings: SecretFinding[]): SecretFinding[] {
  const key = (f: SecretFinding) => `${f.variableName}::${f.patternName}::${f.matchSource}`;
  const map = new Map<string, SecretFinding>();

  for (const finding of findings) {
    const k = key(finding);
    const existing = map.get(k);
    if (!existing || SEVERITY_ORDER[finding.severity] < SEVERITY_ORDER[existing.severity]) {
      map.set(k, finding);
    }
  }

  return Array.from(map.values());
}

/**
 * Allows consumers to test against a custom pattern set (useful for
 * user-defined patterns in future versions).
 */
export function matchVariableWithPatterns(
  variable: VariableEntry,
  groupId: number,
  groupName: string,
  namePatterns: SecretPattern[],
  valuePatterns: SecretPattern[]
): SecretFinding[] {
  if (variable.isSecret) return [];

  const findings: SecretFinding[] = [];

  for (const pattern of namePatterns) {
    if (pattern.namePattern && pattern.namePattern.test(variable.name)) {
      findings.push({
        variableGroupId: groupId,
        variableGroupName: groupName,
        variableName: variable.name,
        variableValue: variable.value,
        isAlreadySecret: false,
        severity: pattern.severity,
        matchSource: MatchSource.VariableName,
        patternName: pattern.name,
        description: pattern.description,
        confidence: computeConfidence(
          variable.name,
          variable.value,
          MatchSource.VariableName,
          pattern.name
        ),
      });
    }
  }

  if (variable.value) {
    for (const pattern of valuePatterns) {
      if (pattern.valuePattern && pattern.valuePattern.test(variable.value)) {
        // Enhancement #1: Skip false positives (GUID patterns, resource IDs, etc.)
        if (isLikelyFalsePositive(variable.value, variable.name, pattern.name)) {
          continue;
        }

        findings.push({
          variableGroupId: groupId,
          variableGroupName: groupName,
          variableName: variable.name,
          variableValue: variable.value,
          isAlreadySecret: false,
          severity: pattern.severity,
          matchSource: MatchSource.VariableValue,
          patternName: pattern.name,
          description: pattern.description,
          confidence: computeConfidence(
            variable.name,
            variable.value,
            MatchSource.VariableValue,
            pattern.name
          ),
        });
      }
    }
  }

  return findings;
}

/**
 * Generates the composite key used for ignore-list matching.
 */
export function makeIgnoreKey(groupId: number, variableName: string, patternName: string): string {
  return `${groupId}::${variableName}::${patternName}`;
}

/**
 * Checks whether an ignore entry has expired.
 * Returns `true` if the entry is still active (not expired).
 */
export function isIgnoreEntryActive(entry: IgnoreEntry): boolean {
  if (!entry.expiresAt) return true; // No expiry => always active
  const now = new Date();
  const expiry = new Date(entry.expiresAt);
  return expiry > now;
}

/**
 * Filters out findings that match any active entry in the ignore list.
 * Expired ignore entries are treated as inactive (their findings will be shown).
 * Returns a new array; does not mutate the input.
 */
export function filterIgnoredFindings(
  findings: SecretFinding[],
  ignoreEntries: IgnoreEntry[]
): SecretFinding[] {
  if (ignoreEntries.length === 0) return findings;

  // Only consider active (non-expired) ignore entries
  const activeEntries = ignoreEntries.filter(isIgnoreEntryActive);
  if (activeEntries.length === 0) return findings;

  const ignoreKeys = new Set(
    activeEntries.map((e) => makeIgnoreKey(e.variableGroupId, e.variableName, e.patternName))
  );

  return findings.filter(
    (f) => !ignoreKeys.has(makeIgnoreKey(f.variableGroupId, f.variableName, f.patternName))
  );
}

/**
 * Converts persisted CustomPatternDefinition objects (string regex) into
 * SecretPattern objects (compiled RegExp). Invalid patterns are skipped.
 */
export function compileCustomPatterns(definitions: CustomPatternDefinition[]): {
  namePatterns: SecretPattern[];
  valuePatterns: SecretPattern[];
} {
  const namePatterns: SecretPattern[] = [];
  const valuePatterns: SecretPattern[] = [];

  for (const def of definitions) {
    if (!def.enabled) continue;

    let compiled: RegExp;
    try {
      compiled = new RegExp(def.regexSource, def.regexFlags);
    } catch (e) {
      console.warn(`Skipping invalid custom pattern "${def.name}": ${e}`);
      continue;
    }

    const pattern: SecretPattern = {
      name: def.name,
      description: def.description,
      severity: def.severity,
    };

    if (def.matchTarget === MatchSource.VariableName) {
      pattern.namePattern = compiled;
      namePatterns.push(pattern);
    } else {
      pattern.valuePattern = compiled;
      valuePatterns.push(pattern);
    }
  }

  return { namePatterns, valuePatterns };
}

/**
 * Applies user overrides (enabled/disabled, severity, order) to a set of
 * built-in patterns. Returns a new array — does not mutate the input.
 */
export function applyBuiltInOverrides(
  patterns: SecretPattern[],
  overrides: BuiltInPatternOverride[]
): SecretPattern[] {
  if (overrides.length === 0) return patterns;

  const overrideMap = new Map(overrides.map((o) => [o.patternName, o]));

  let result = patterns
    .map((p) => {
      const override = overrideMap.get(p.name);
      if (!override) return p;
      if (!override.enabled) return null;
      if (override.severity) {
        return { ...p, severity: override.severity };
      }
      return p;
    })
    .filter((p): p is SecretPattern => p !== null);

  // Apply custom ordering if any overrides have an order field
  const hasOrder = overrides.some((o) => o.order !== undefined);
  if (hasOrder) {
    result = result.slice().sort((a, b) => {
      const oa = overrideMap.get(a.name)?.order;
      const ob = overrideMap.get(b.name)?.order;
      const orderA = oa !== undefined ? oa : 9999;
      const orderB = ob !== undefined ? ob : 9999;
      return orderA - orderB;
    });
  }

  return result;
}

/**
 * Scans variables using both built-in patterns AND compiled custom patterns.
 * Returns de-duplicated, sorted findings.
 */
export function scanVariablesWithCustomPatterns(
  variables: VariableEntry[],
  groupId: number,
  groupName: string,
  customNamePatterns: SecretPattern[],
  customValuePatterns: SecretPattern[],
  builtInOverrides?: BuiltInPatternOverride[]
): SecretFinding[] {
  const allFindings: SecretFinding[] = [];

  const effectiveNamePatterns = builtInOverrides
    ? applyBuiltInOverrides(NAME_PATTERNS, builtInOverrides)
    : NAME_PATTERNS;
  const effectiveValuePatterns = builtInOverrides
    ? applyBuiltInOverrides(VALUE_PATTERNS, builtInOverrides)
    : VALUE_PATTERNS;

  for (const variable of variables) {
    allFindings.push(
      ...matchVariableWithPatterns(
        variable,
        groupId,
        groupName,
        effectiveNamePatterns,
        effectiveValuePatterns
      )
    );
    allFindings.push(
      ...matchVariableWithPatterns(
        variable,
        groupId,
        groupName,
        customNamePatterns,
        customValuePatterns
      )
    );
  }

  const deduped = deduplicateFindings(allFindings);
  deduped.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.variableName.localeCompare(b.variableName);
  });

  return deduped;
}
