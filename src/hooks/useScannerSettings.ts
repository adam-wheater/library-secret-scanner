import * as React from "react";
import { ScannerSettingsService } from "../services/ScannerSettingsService";
import {
  CustomPatternDefinition,
  IgnoreEntry,
  BuiltInPatternOverride,
  ScanHistoryEntry,
} from "../models/interfaces";

export interface UseScannerSettingsResult {
  loading: boolean;
  error: string | null;
  customPatterns: CustomPatternDefinition[];
  addPattern: (pattern: CustomPatternDefinition) => Promise<void>;
  updatePattern: (
    id: string,
    updates: Partial<Omit<CustomPatternDefinition, "id" | "createdAt">>
  ) => Promise<void>;
  removePattern: (id: string) => Promise<void>;
  ignoreEntries: IgnoreEntry[];
  addIgnoreEntry: (entry: IgnoreEntry) => Promise<void>;
  addIgnoreEntries: (entries: IgnoreEntry[]) => Promise<void>;
  removeIgnoreEntry: (id: string) => Promise<void>;
  clearIgnoreList: () => Promise<void>;
  builtInOverrides: BuiltInPatternOverride[];
  saveBuiltInOverrides: (overrides: BuiltInPatternOverride[]) => Promise<void>;
  scanHistory: ScanHistoryEntry[];
  addScanHistoryEntry: (entry: ScanHistoryEntry) => Promise<void>;
  reload: () => Promise<void>;
}

export function useScannerSettings(): UseScannerSettingsResult {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customPatterns, setCustomPatterns] = React.useState<CustomPatternDefinition[]>([]);
  const [ignoreEntries, setIgnoreEntries] = React.useState<IgnoreEntry[]>([]);
  const [builtInOverrides, setBuiltInOverrides] = React.useState<BuiltInPatternOverride[]>([]);
  const [scanHistory, setScanHistory] = React.useState<ScanHistoryEntry[]>([]);
  const serviceRef = React.useRef(new ScannerSettingsService());

  const loadAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [patternsDoc, ignoreDoc, overridesDoc, historyDoc] = await Promise.all([
        serviceRef.current.getCustomPatterns(),
        serviceRef.current.getIgnoreList(),
        serviceRef.current.getBuiltInOverrides(),
        serviceRef.current.getScanHistory(),
      ]);
      setCustomPatterns(patternsDoc.patterns);
      setIgnoreEntries(ignoreDoc.entries);
      setBuiltInOverrides(overridesDoc.overrides);
      setScanHistory(historyDoc.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addPattern = React.useCallback(async (pattern: CustomPatternDefinition) => {
    const doc = await serviceRef.current.addCustomPattern(pattern);
    setCustomPatterns(doc.patterns);
  }, []);

  const updatePattern = React.useCallback(
    async (id: string, updates: Partial<Omit<CustomPatternDefinition, "id" | "createdAt">>) => {
      const doc = await serviceRef.current.updateCustomPattern(id, updates);
      setCustomPatterns(doc.patterns);
    },
    []
  );

  const removePattern = React.useCallback(async (id: string) => {
    const doc = await serviceRef.current.removeCustomPattern(id);
    setCustomPatterns(doc.patterns);
  }, []);

  const addIgnoreEntry = React.useCallback(async (entry: IgnoreEntry) => {
    const doc = await serviceRef.current.addIgnoreEntry(entry);
    setIgnoreEntries(doc.entries);
  }, []);

  const addIgnoreEntries = React.useCallback(async (entries: IgnoreEntry[]) => {
    const doc = await serviceRef.current.addIgnoreEntries(entries);
    setIgnoreEntries(doc.entries);
  }, []);

  const removeIgnoreEntry = React.useCallback(async (id: string) => {
    const doc = await serviceRef.current.removeIgnoreEntry(id);
    setIgnoreEntries(doc.entries);
  }, []);

  const clearIgnoreList = React.useCallback(async () => {
    const doc = await serviceRef.current.clearIgnoreList();
    setIgnoreEntries(doc.entries);
  }, []);

  const saveBuiltInOverrides = React.useCallback(async (overrides: BuiltInPatternOverride[]) => {
    const doc = await serviceRef.current.saveBuiltInOverrides(overrides);
    setBuiltInOverrides(doc.overrides);
  }, []);

  const addScanHistoryEntry = React.useCallback(async (entry: ScanHistoryEntry) => {
    const doc = await serviceRef.current.addScanHistoryEntry(entry);
    setScanHistory(doc.entries);
  }, []);

  return {
    loading,
    error,
    customPatterns,
    addPattern,
    updatePattern,
    removePattern,
    ignoreEntries,
    addIgnoreEntry,
    addIgnoreEntries,
    removeIgnoreEntry,
    clearIgnoreList,
    builtInOverrides,
    saveBuiltInOverrides,
    scanHistory,
    addScanHistoryEntry,
    reload: loadAll,
  };
}
