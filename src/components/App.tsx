import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IProjectPageService,
  ILocationService,
} from "azure-devops-extension-api";
import {
  ScanResult,
  ScanProgress,
  Severity,
  Confidence,
  MatchSource,
  SecretFinding,
  IgnoreEntry,
  ScanHistoryEntry,
} from "../models/interfaces";
import {
  getVariableGroups,
  extractVariables,
  getGroupMetadata,
  markVariablesAsSecret,
  getPipelineVariableGroupUsage,
  detectSecretVariableGroupReferences,
} from "../scanning/LibraryGroupService";
import {
  scanVariablesWithCustomPatterns,
  compileCustomPatterns,
  filterIgnoredFindings,
} from "../scanning/SecretPatternMatcher";
import { generateId } from "../utils/idUtils";
import { formatError } from "../utils/formatError";
import { PAGE_SIZE } from "../utils/constants";
import { useScannerSettings } from "../hooks/useScannerSettings";
import { BRAND, BrandGlyph } from "../brand";
import { SettingsToolbar, ViewMode } from "./SettingsToolbar";
import { CustomPatternPanel } from "./CustomPatternPanel";
import { BuiltInPatternsPanel } from "./BuiltInPatternsPanel";
import { IgnoreListPanel } from "./IgnoreListPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { SummaryBar } from "./SummaryBar";
import { GroupCard } from "./GroupCard";
import { maskValue } from "./FindingRow";
import { NotificationBanners } from "./NotificationBanners";
import { ScanToolbar } from "./ScanToolbar";
import { ScanHistoryPanel } from "./ScanHistoryPanel";
import { AppShell, Button, EmptyState, ErrorBoundary, IconSearch, Progress } from "./ui";

const findingKey = (f: SecretFinding) =>
  `${f.variableGroupId}::${f.variableName}::${f.patternName}::${f.matchSource}`;

interface DialogState {
  type: "confirm" | "prompt";
  title: string;
  message: string;
  confirmLabel?: string;
  showExpiryDate?: boolean;
  onConfirm: (inputValue?: string, expiresAt?: string) => void;
}

const AppInner: React.FC = () => {
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [progress, setProgress] = React.useState<ScanProgress | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(new Set());
  const [filterSeverity, setFilterSeverity] = React.useState<Severity | "all">("all");
  const [filterConfidence, setFilterConfidence] = React.useState<Confidence | "all">("all");
  const [showCleanGroups, setShowCleanGroups] = React.useState(false);
  const [activeView, setActiveView] = React.useState<ViewMode>("scan");
  const [totalIgnored, setTotalIgnored] = React.useState(0);
  const [selectedFindings, setSelectedFindings] = React.useState<Set<string>>(new Set());
  const [groupSearchTerm, setGroupSearchTerm] = React.useState("");
  const [bulkIgnoring, setBulkIgnoring] = React.useState(false);
  const [markingAsSecret, setMarkingAsSecret] = React.useState(false);
  const [markAsSecretError, setMarkAsSecretError] = React.useState<string | null>(null);
  const [markAsSecretSuccess, setMarkAsSecretSuccess] = React.useState<string | null>(null);
  const [showUnusedOnly, setShowUnusedOnly] = React.useState(false);
  const [pipelineRefWarning, setPipelineRefWarning] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [ignoringFindingKey, setIgnoringFindingKey] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const scanLockRef = React.useRef(false);
  const projectNameRef = React.useRef<string>("");
  const orgUrlRef = React.useRef<string>("");
  const [projectName, setProjectName] = React.useState<string>("");
  const settings = useScannerSettings();

  // Resolve the project name up front so the header can show it before a scan.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projectService = await SDK.getService<IProjectPageService>(
          CommonServiceIds.ProjectPageService
        );
        const project = await projectService.getProject();
        if (!cancelled && project?.name) {
          projectNameRef.current = project.name;
          setProjectName(project.name);
        }
      } catch {
        /* non-fatal: the scan resolves the project again and reports failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScan = React.useCallback(async () => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanning(true);
    setProgress(null);
    setScanError(null);
    setScanResult(null);
    setPipelineRefWarning(null);
    setActiveView("scan");
    setSelectedFindings(new Set());
    setGroupSearchTerm("");
    setCurrentPage(0);

    try {
      const projectService = await SDK.getService<IProjectPageService>(
        CommonServiceIds.ProjectPageService
      );
      const project = await projectService.getProject();
      if (!project) throw new Error("Could not determine the current project.");
      projectNameRef.current = project.name;
      setProjectName(project.name);

      const locationService = await SDK.getService<ILocationService>(
        CommonServiceIds.LocationService
      );
      orgUrlRef.current = await locationService.getServiceLocation();
      setProgress({ phase: "Fetching variable groups...", current: 0, total: 0 });

      const groups = await getVariableGroups(project.name);
      const { namePatterns: customNamePatterns, valuePatterns: customValuePatterns } =
        compileCustomPatterns(settings.customPatterns);
      const summaries = [];
      let totalVariables = 0,
        totalAlreadySecret = 0,
        totalFindings = 0,
        ignored = 0;

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        setProgress({ phase: `Scanning "${group.name}"...`, current: i + 1, total: groups.length });
        const meta = getGroupMetadata(group);
        const variables = extractVariables(group);
        const rawFindings = scanVariablesWithCustomPatterns(
          variables,
          meta.id,
          meta.name,
          customNamePatterns,
          customValuePatterns,
          settings.builtInOverrides
        );
        const findings = filterIgnoredFindings(rawFindings, settings.ignoreEntries);
        ignored += rawFindings.length - findings.length;
        totalVariables += meta.variableCount;
        totalAlreadySecret += meta.secretCount;
        totalFindings += findings.length;
        summaries.push({
          ...meta,
          findings,
          pipelineReferences: [] as { pipelineName: string; repoName: string }[],
        });
      }

      setProgress({ phase: "Checking pipeline references...", current: 0, total: 0 });
      try {
        const usageMap = await getPipelineVariableGroupUsage(
          project.name,
          (phase, current, total) => setProgress({ phase, current, total })
        );
        for (const summary of summaries)
          summary.pipelineReferences = usageMap.get(summary.name) ?? [];

        // Enhancement #10: Detect variable groups whose names suggest secret storage
        const secretGroupWarnings = detectSecretVariableGroupReferences(usageMap);
        if (secretGroupWarnings.length > 0) {
          const warningLines = secretGroupWarnings
            .slice(0, 5)
            .map((w) => `"${w.groupName}" used by pipeline "${w.pipelineName}"`);
          const extra =
            secretGroupWarnings.length > 5 ? ` and ${secretGroupWarnings.length - 5} more` : "";
          setPipelineRefWarning(
            `Variable groups with secret-suggestive names detected: ${warningLines.join("; ")}${extra}. Consider reviewing these groups.`
          );
        }
      } catch (err) {
        console.warn("Pipeline reference scan failed (non-fatal):", err);
        setPipelineRefWarning(
          `Pipeline reference scan failed: ${formatError(err)}. Pipeline usage data may be incomplete.`
        );
      }

      summaries.sort((a, b) => {
        if (a.findings.length > 0 && b.findings.length === 0) return -1;
        if (a.findings.length === 0 && b.findings.length > 0) return 1;
        return b.findings.length - a.findings.length;
      });

      const result: ScanResult = {
        groups: summaries,
        totalVariables,
        totalAlreadySecret,
        totalFindings,
        scannedAt: new Date(),
      };
      setScanResult(result);
      setTotalIgnored(ignored);
      setExpandedGroups(new Set(summaries.filter((g) => g.findings.length > 0).map((g) => g.id)));

      // Enhancement #9: Store scan history
      const findingsByRepo: Record<string, number> = {};
      for (const s of summaries) {
        if (s.findings.length > 0) {
          findingsByRepo[s.name] = s.findings.length;
        }
      }
      const historyEntry: ScanHistoryEntry = {
        id: generateId(),
        scannedAt: new Date().toISOString(),
        totalGroups: summaries.length,
        totalVariables,
        totalAlreadySecret,
        totalFindings,
        findingsByRepo,
      };
      try {
        await settings.addScanHistoryEntry(historyEntry);
      } catch (err) {
        console.warn("Failed to save scan history (non-fatal):", err);
      }
    } catch (err) {
      setScanError(`Scan failed: ${formatError(err)}`);
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
      setProgress(null);
      scanLockRef.current = false;
    }
  }, [
    settings.customPatterns,
    settings.ignoreEntries,
    settings.builtInOverrides,
    settings.addScanHistoryEntry,
  ]);

  const handleIgnoreFinding = React.useCallback(
    async (finding: SecretFinding, reason?: string, expiresAt?: string) => {
      const entry: IgnoreEntry = {
        id: generateId(),
        variableGroupId: finding.variableGroupId,
        variableGroupName: finding.variableGroupName,
        variableName: finding.variableName,
        patternName: finding.patternName,
        reason: reason ?? "",
        ignoredAt: new Date().toISOString(),
        ignoredBy: "",
        ...(expiresAt ? { expiresAt } : {}),
      };
      await settings.addIgnoreEntry(entry);
      setScanResult((prev) => {
        if (!prev) return prev;
        let removed = 0;
        const groups = prev.groups.map((g) => {
          if (g.id !== finding.variableGroupId) return g;
          const kept = g.findings.filter(
            (f) =>
              !(f.variableName === finding.variableName && f.patternName === finding.patternName)
          );
          removed += g.findings.length - kept.length;
          return { ...g, findings: kept };
        });
        return { ...prev, groups, totalFindings: prev.totalFindings - removed };
      });
      setTotalIgnored((prev) => prev + 1);
      setSelectedFindings((prev) => {
        const next = new Set(prev);
        next.delete(findingKey(finding));
        return next;
      });
    },
    [settings]
  );

  const handleIgnoreFindingWithDialog = React.useCallback(
    (finding: SecretFinding) => {
      setDialog({
        type: "prompt",
        title: "Ignore Finding",
        message: `Ignore "${finding.patternName}" on variable "${finding.variableName}"? You can provide an optional reason and expiry date.`,
        confirmLabel: "Ignore",
        showExpiryDate: true,
        onConfirm: async (inputValue?: string, expiresAt?: string) => {
          setDialog(null);
          setIgnoringFindingKey(findingKey(finding));
          try {
            await handleIgnoreFinding(finding, inputValue ?? "", expiresAt);
          } finally {
            setIgnoringFindingKey(null);
          }
        },
      });
    },
    [handleIgnoreFinding]
  );

  const handleBulkIgnore = React.useCallback(() => {
    if (selectedFindings.size === 0) return;
    setDialog({
      type: "prompt",
      title: "Ignore Selected Findings",
      message: `Ignore ${selectedFindings.size} finding(s)? You can provide an optional reason and expiry date.`,
      confirmLabel: "Ignore",
      showExpiryDate: true,
      onConfirm: async (inputValue?: string, expiresAt?: string) => {
        setDialog(null);
        setBulkIgnoring(true);
        try {
          const toIgnore: SecretFinding[] = [];
          for (const group of scanResult?.groups ?? [])
            for (const f of group.findings)
              if (selectedFindings.has(findingKey(f))) toIgnore.push(f);
          const entries: IgnoreEntry[] = toIgnore.map((f) => ({
            id: generateId(),
            variableGroupId: f.variableGroupId,
            variableGroupName: f.variableGroupName,
            variableName: f.variableName,
            patternName: f.patternName,
            reason: inputValue ?? "",
            ignoredAt: new Date().toISOString(),
            ignoredBy: "",
            ...(expiresAt ? { expiresAt } : {}),
          }));
          await settings.addIgnoreEntries(entries);
          const ignoredKeys = new Set(toIgnore.map(findingKey));
          setScanResult((prev) => {
            if (!prev) return prev;
            let removedCount = 0;
            const groups = prev.groups.map((g) => {
              const before = g.findings.length;
              const filtered = g.findings.filter((f) => !ignoredKeys.has(findingKey(f)));
              removedCount += before - filtered.length;
              return filtered.length === before ? g : { ...g, findings: filtered };
            });
            return { ...prev, groups, totalFindings: prev.totalFindings - removedCount };
          });
          setTotalIgnored((prev) => prev + toIgnore.length);
          setSelectedFindings(new Set());
        } catch (err) {
          setMarkAsSecretError(`Failed to ignore findings: ${formatError(err)}`);
        } finally {
          setBulkIgnoring(false);
        }
      },
    });
  }, [selectedFindings, scanResult, settings]);

  const handleMarkFindingAsSecret = React.useCallback(
    (finding: SecretFinding) => {
      const group = scanResult?.groups.find((g) => g.id === finding.variableGroupId);
      if (group?.type === "AzureKeyVault") {
        setMarkAsSecretError(
          "Key Vault-linked variable groups are read-only and cannot be modified here."
        );
        return;
      }
      setDialog({
        type: "confirm",
        title: "Mark as Secret",
        message: `Mark variable "${finding.variableName}" in group "${finding.variableGroupName}" as secret? This cannot be undone.`,
        confirmLabel: "Mark as Secret",
        onConfirm: async () => {
          setDialog(null);
          setMarkingAsSecret(true);
          setMarkAsSecretError(null);
          setMarkAsSecretSuccess(null);
          try {
            const result = await markVariablesAsSecret(
              projectNameRef.current,
              finding.variableGroupId,
              [finding.variableName]
            );
            if (result.updated.length > 0)
              setMarkAsSecretSuccess(
                `Marked "${finding.variableName}" as secret in "${finding.variableGroupName}". Refreshing...`
              );
            if (result.notFound.length > 0)
              setMarkAsSecretError(
                `Variable "${finding.variableName}" was not found in the group. It may have been renamed or deleted.`
              );
          } catch (err) {
            setMarkAsSecretError(`Failed to mark as secret: ${formatError(err)}`);
          } finally {
            setMarkingAsSecret(false);
          }
          try {
            await handleScan();
          } catch {
            /* handled inside handleScan */
          }
        },
      });
    },
    [handleScan, scanResult]
  );

  const handleBulkMarkAsSecret = React.useCallback(() => {
    if (selectedFindings.size === 0) return;
    const groupedByVarGroup = new Map<number, { groupName: string; variableNames: Set<string> }>();
    for (const group of scanResult?.groups ?? [])
      for (const f of group.findings)
        if (selectedFindings.has(findingKey(f)) && group.type !== "AzureKeyVault") {
          let entry = groupedByVarGroup.get(f.variableGroupId);
          if (!entry) {
            entry = { groupName: f.variableGroupName, variableNames: new Set() };
            groupedByVarGroup.set(f.variableGroupId, entry);
          }
          entry.variableNames.add(f.variableName);
        }
    const totalVars = Array.from(groupedByVarGroup.values()).reduce(
      (sum, e) => sum + e.variableNames.size,
      0
    );
    if (totalVars === 0) return;
    setDialog({
      type: "confirm",
      title: "Mark as Secret",
      message: `Mark ${totalVars} variable(s) across ${groupedByVarGroup.size} group(s) as secret? This cannot be undone.`,
      confirmLabel: "Mark as Secret",
      onConfirm: async () => {
        setDialog(null);
        setMarkingAsSecret(true);
        setMarkAsSecretError(null);
        setMarkAsSecretSuccess(null);
        const successes: string[] = [],
          errors: string[] = [];
        for (const [groupId, entry] of groupedByVarGroup) {
          try {
            const result = await markVariablesAsSecret(
              projectNameRef.current,
              groupId,
              Array.from(entry.variableNames)
            );
            if (result.updated.length > 0)
              successes.push(`${entry.groupName}: ${result.updated.length} variable(s)`);
            if (result.notFound.length > 0)
              errors.push(`${entry.groupName}: ${result.notFound.join(", ")} not found`);
          } catch (err) {
            errors.push(`${entry.groupName}: ${formatError(err)}`);
          }
        }
        if (successes.length > 0)
          setMarkAsSecretSuccess(`Marked as secret: ${successes.join("; ")}. Refreshing...`);
        if (errors.length > 0) setMarkAsSecretError(`Errors: ${errors.join("; ")}`);
        setMarkingAsSecret(false);
        try {
          await handleScan();
        } catch {
          /* handled inside handleScan */
        }
      },
    });
  }, [selectedFindings, scanResult, handleScan]);

  const handleSelectGroup = React.useCallback(
    (groupId: number, selected: boolean, visibleFindings: SecretFinding[]) => {
      setSelectedFindings((prev) => {
        const next = new Set(prev);
        for (const f of visibleFindings) {
          const key = findingKey(f);
          if (selected) next.add(key);
          else next.delete(key);
        }
        return next;
      });
    },
    []
  );

  const toggleGroup = React.useCallback((id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Apply confidence filter inside filteredGroups
  const filteredGroups = React.useMemo(() => {
    if (!scanResult) return [];
    const search = groupSearchTerm.toLowerCase();
    return scanResult.groups
      .map((g) => {
        // Apply severity + confidence filters to each group's findings
        let findings = g.findings;
        if (filterSeverity !== "all") {
          findings = findings.filter((f) => f.severity === filterSeverity);
        }
        if (filterConfidence !== "all") {
          findings = findings.filter((f) => f.confidence === filterConfidence);
        }
        return { ...g, findings };
      })
      .filter((g) => {
        if (!showCleanGroups && g.findings.length === 0) return false;
        if (showUnusedOnly && g.pipelineReferences.length > 0) return false;
        if (search && !g.name.toLowerCase().includes(search)) return false;
        return true;
      });
  }, [
    scanResult,
    filterSeverity,
    filterConfidence,
    showCleanGroups,
    showUnusedOnly,
    groupSearchTerm,
  ]);

  // Enhancement #5: Pagination
  const totalFilteredGroups = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredGroups / PAGE_SIZE));
  // Clamp: ignoring or marking findings can shrink the list below the current
  // page without a filter change, which would otherwise leave an empty page.
  const page = Math.min(currentPage, totalPages - 1);
  const paginatedGroups = React.useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredGroups.slice(start, start + PAGE_SIZE);
  }, [filteredGroups, page]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [filterSeverity, filterConfidence, showCleanGroups, showUnusedOnly, groupSearchTerm]);

  const allVisibleFindings = React.useMemo(() => {
    const findings: SecretFinding[] = [];
    for (const group of filteredGroups) {
      if (group.type === "AzureKeyVault") continue;
      findings.push(...group.findings);
    }
    return findings;
  }, [filteredGroups]);

  const allVisibleSelected =
    allVisibleFindings.length > 0 &&
    allVisibleFindings.every((f) => selectedFindings.has(findingKey(f)));
  const someVisibleSelected =
    !allVisibleSelected && allVisibleFindings.some((f) => selectedFindings.has(findingKey(f)));

  const handleSelectAll = React.useCallback(
    (selected: boolean) => {
      setSelectedFindings((prev) => {
        const next = new Set(prev);
        for (const f of allVisibleFindings) {
          if (selected) next.add(findingKey(f));
          else next.delete(findingKey(f));
        }
        return next;
      });
    },
    [allVisibleFindings]
  );

  const handleExpandAll = React.useCallback(() => {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.id)));
  }, [filteredGroups]);
  const handleCollapseAll = React.useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  // Enhancement #6: CSV export respects active filters
  const handleExportCsv = React.useCallback(() => {
    if (!scanResult) return;
    const headers = [
      "Variable Group",
      "Group ID",
      "Variable Name",
      "Severity",
      "Confidence",
      "Matched On",
      "Pattern",
      "Description",
      "Value Preview",
    ];
    const rows: string[][] = [];
    // Use filteredGroups (respects active filters) instead of scanResult.groups
    for (const group of filteredGroups)
      for (const f of group.findings) {
        const masked = maskValue(f.variableValue);
        rows.push([
          f.variableGroupName,
          String(f.variableGroupId),
          f.variableName,
          f.severity,
          f.confidence ?? "",
          f.matchSource === MatchSource.VariableName ? "Name" : "Value",
          f.patternName,
          f.description,
          masked,
        ]);
      }
    const escapeCsv = (field: string) =>
      field.includes(",") || field.includes('"') || field.includes("\n")
        ? `"${field.replace(/"/g, '""')}"`
        : field;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `secret-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scanResult, filteredGroups]);

  const handleSelectFinding = React.useCallback((finding: SecretFinding, selected: boolean) => {
    setSelectedFindings((prev) => {
      const next = new Set(prev);
      if (selected) next.add(findingKey(finding));
      else next.delete(findingKey(finding));
      return next;
    });
  }, []);

  const busy = markingAsSecret || bulkIgnoring;
  const scanDisabled = scanning || settings.loading || busy;
  const scanLabel = scanning
    ? "Scanning..."
    : settings.loading
      ? "Loading..."
      : busy
        ? "Working..."
        : "Scan Library Groups";

  let extensionVersion = "";
  try {
    extensionVersion = SDK.getExtensionContext()?.version ?? "";
  } catch {
    /* outside a host */
  }

  return (
    <AppShell
      title={BRAND.name}
      subtitle={projectName ? `${BRAND.tagline} · ${projectName}` : BRAND.tagline}
      mark={<BrandGlyph />}
      actions={
        <Button
          variant="primary"
          icon={<IconSearch />}
          onClick={handleScan}
          disabled={scanDisabled}
          busy={scanning}
        >
          {scanLabel}
        </Button>
      }
    >
      <ConfirmDialog
        isOpen={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel="Cancel"
        danger={dialog?.type === "confirm"}
        onConfirm={(inputValue, expiresAt) => dialog?.onConfirm(inputValue, expiresAt)}
        onCancel={() => setDialog(null)}
        showInput={dialog?.type === "prompt"}
        inputLabel={dialog?.type === "prompt" ? "Reason (optional)" : undefined}
        inputPlaceholder={
          dialog?.type === "prompt" ? "e.g. False positive, not a real secret" : undefined
        }
        showExpiryDate={dialog?.showExpiryDate}
      />

      <SettingsToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        builtInOverrideCount={settings.builtInOverrides.length}
        patternCount={settings.customPatterns.length}
        ignoreCount={settings.ignoreEntries.length}
        historyCount={settings.scanHistory.length}
      />

      {progress && (
        <Progress
          label={progress.phase}
          current={progress.current}
          total={progress.total}
          indeterminate={progress.total === 0}
        />
      )}

      <NotificationBanners
        scanError={scanError}
        onDismissScanError={() => setScanError(null)}
        pipelineRefWarning={pipelineRefWarning}
        onDismissPipelineWarning={() => setPipelineRefWarning(null)}
        settingsError={settings.error}
        scanning={scanning}
        onRetrySettings={() => settings.reload()}
        markAsSecretSuccess={markAsSecretSuccess}
        onDismissSuccess={() => setMarkAsSecretSuccess(null)}
        markAsSecretError={markAsSecretError}
        onDismissMarkError={() => setMarkAsSecretError(null)}
      />

      {activeView === "rules" && (
        <BuiltInPatternsPanel
          overrides={settings.builtInOverrides}
          onSave={settings.saveBuiltInOverrides}
        />
      )}
      {activeView === "patterns" && (
        <CustomPatternPanel
          patterns={settings.customPatterns}
          onAdd={settings.addPattern}
          onUpdate={settings.updatePattern}
          onRemove={settings.removePattern}
        />
      )}
      {activeView === "ignorelist" && (
        <IgnoreListPanel
          entries={settings.ignoreEntries}
          onRemove={settings.removeIgnoreEntry}
          onClear={settings.clearIgnoreList}
        />
      )}
      {activeView === "history" && <ScanHistoryPanel entries={settings.scanHistory} />}

      {activeView === "scan" && (
        <>
          {scanResult && (
            <>
              <SummaryBar result={scanResult} ignoredCount={totalIgnored} />
              <ScanToolbar
                groupSearchTerm={groupSearchTerm}
                onSearchChange={setGroupSearchTerm}
                filterSeverity={filterSeverity}
                onFilterSeverityChange={setFilterSeverity}
                filterConfidence={filterConfidence}
                onFilterConfidenceChange={setFilterConfidence}
                showCleanGroups={showCleanGroups}
                onShowCleanGroupsChange={setShowCleanGroups}
                showUnusedOnly={showUnusedOnly}
                onShowUnusedOnlyChange={setShowUnusedOnly}
                allVisibleFindings={allVisibleFindings}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                onSelectAll={handleSelectAll}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                selectedCount={selectedFindings.size}
                onBulkIgnore={handleBulkIgnore}
                onBulkMarkAsSecret={handleBulkMarkAsSecret}
                markingAsSecret={markingAsSecret}
                bulkIgnoring={bulkIgnoring}
                totalFindings={scanResult.totalFindings}
                onExportCsv={handleExportCsv}
              />
              {filteredGroups.length === 0 ? (
                <EmptyState
                  title={
                    scanResult.totalFindings === 0
                      ? "No issues found -- all variable groups look clean!"
                      : "No groups match the current filter."
                  }
                />
              ) : (
                <>
                  {paginatedGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      expanded={expandedGroups.has(group.id)}
                      onToggle={() => toggleGroup(group.id)}
                      filterSeverity={"all"}
                      onIgnoreFinding={handleIgnoreFindingWithDialog}
                      onMarkAsSecret={handleMarkFindingAsSecret}
                      selectedFindings={selectedFindings}
                      onSelectFinding={handleSelectFinding}
                      onSelectGroup={handleSelectGroup}
                      busy={busy}
                      orgUrl={orgUrlRef.current}
                      projectName={projectNameRef.current}
                      ignoringFindingKey={ignoringFindingKey}
                    />
                  ))}

                  {/* Enhancement #5: Pagination controls */}
                  {totalPages > 1 && (
                    <nav className="ax-pager" aria-label="Pagination">
                      <Button
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        Prev
                      </Button>
                      <span>
                        Page {page + 1} of {totalPages} ({totalFilteredGroups} groups)
                      </span>
                      <Button
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                      </Button>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
          {!scanResult && !scanning && !scanError && (
            <EmptyState
              title={
                <>
                  Click <strong>Scan Library Groups</strong> to check for variables that should be
                  marked as secret.
                </>
              }
            >
              The scanner checks variable names and values against known secret patterns (passwords,
              connection strings, API keys, tokens, certificates, and more).
            </EmptyState>
          )}
        </>
      )}

      <footer className="ax-footer">
        <span>
          {BRAND.name}
          {extensionVersion ? ` ${extensionVersion}` : ""}
        </span>
        <span>Runs entirely in your browser · no data leaves Azure DevOps</span>
      </footer>
    </AppShell>
  );
};

export const App: React.FC = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);
