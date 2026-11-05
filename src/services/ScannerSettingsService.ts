import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IExtensionDataManager,
} from "azure-devops-extension-api";
import {
  CustomPatternsDocument,
  CustomPatternDefinition,
  IgnoreListDocument,
  IgnoreEntry,
  BuiltInPatternOverridesDocument,
  BuiltInPatternOverride,
  ScanHistoryDocument,
  ScanHistoryEntry,
  ProjectSettingsDocument,
} from "../models/interfaces";
import {
  SCANNER_SETTINGS_COLLECTION,
  CUSTOM_PATTERNS_DOC_ID,
  IGNORE_LIST_DOC_ID,
  BUILTIN_OVERRIDES_DOC_ID,
  SCAN_HISTORY_DOC_ID,
  PROJECT_SETTINGS_DOC_PREFIX,
  SETTINGS_VERSION,
  MAX_SCAN_HISTORY_ENTRIES,
} from "../utils/constants";

/**
 * True only when the data service says the document is missing. Any other
 * failure (network, auth, throttling) must propagate: seeding on it would
 * overwrite the user's real settings with an empty document.
 */
export function isDocumentNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as {
    status?: unknown;
    message?: unknown;
    serverError?: { typeKey?: unknown; message?: unknown };
  };
  if (e.status === 404) return true;
  const typeKey = e.serverError?.typeKey;
  if (typeof typeKey === "string" && /DocumentDoesNotExist/i.test(typeKey)) return true;
  const message =
    typeof e.message === "string"
      ? e.message
      : typeof e.serverError?.message === "string"
        ? e.serverError.message
        : "";
  return /does not exist|not found/i.test(message);
}

export class ScannerSettingsService {
  private dataManagerPromise: Promise<IExtensionDataManager> | null = null;

  private async getDataManager(): Promise<IExtensionDataManager> {
    if (!this.dataManagerPromise) {
      this.dataManagerPromise = (async () => {
        const service = await SDK.getService<IExtensionDataService>(
          CommonServiceIds.ExtensionDataService
        );
        const accessToken = await SDK.getAccessToken();
        return service.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
      })();
    }
    return this.dataManagerPromise;
  }

  // ===== Custom Patterns =====

  async getCustomPatterns(): Promise<CustomPatternsDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        SCANNER_SETTINGS_COLLECTION,
        CUSTOM_PATTERNS_DOC_ID
      )) as CustomPatternsDocument;
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: CustomPatternsDocument = {
        id: CUSTOM_PATTERNS_DOC_ID,
        patterns: [],
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(SCANNER_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async addCustomPattern(pattern: CustomPatternDefinition): Promise<CustomPatternsDocument> {
    try {
      new RegExp(pattern.regexSource, pattern.regexFlags);
    } catch (e) {
      throw new Error(
        `Invalid regex "/${pattern.regexSource}/${pattern.regexFlags}": ${e instanceof Error ? e.message : String(e)}`
      );
    }

    const doc = await this.getCustomPatterns();
    if (doc.patterns.some((p) => p.name === pattern.name)) {
      throw new Error(`A custom pattern named "${pattern.name}" already exists.`);
    }

    doc.patterns.push(pattern);
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  async updateCustomPattern(
    patternId: string,
    updates: Partial<Omit<CustomPatternDefinition, "id" | "createdAt">>
  ): Promise<CustomPatternsDocument> {
    const doc = await this.getCustomPatterns();
    const idx = doc.patterns.findIndex((p) => p.id === patternId);
    if (idx === -1) throw new Error(`Pattern "${patternId}" not found.`);

    const regexSource = updates.regexSource ?? doc.patterns[idx].regexSource;
    const regexFlags = updates.regexFlags ?? doc.patterns[idx].regexFlags;
    try {
      new RegExp(regexSource, regexFlags);
    } catch (e) {
      throw new Error(
        `Invalid regex "/${regexSource}/${regexFlags}": ${e instanceof Error ? e.message : String(e)}`
      );
    }

    doc.patterns[idx] = { ...doc.patterns[idx], ...updates };
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  async removeCustomPattern(patternId: string): Promise<CustomPatternsDocument> {
    const doc = await this.getCustomPatterns();
    const idx = doc.patterns.findIndex((p) => p.id === patternId);
    if (idx === -1) throw new Error(`Pattern "${patternId}" not found.`);
    doc.patterns.splice(idx, 1);
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  // ===== Built-in Pattern Overrides =====

  async getBuiltInOverrides(): Promise<BuiltInPatternOverridesDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        SCANNER_SETTINGS_COLLECTION,
        BUILTIN_OVERRIDES_DOC_ID
      )) as BuiltInPatternOverridesDocument;
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: BuiltInPatternOverridesDocument = {
        id: BUILTIN_OVERRIDES_DOC_ID,
        overrides: [],
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(SCANNER_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async saveBuiltInOverrides(
    overrides: BuiltInPatternOverride[]
  ): Promise<BuiltInPatternOverridesDocument> {
    // Read existing doc first to preserve __etag for version tracking
    const doc = await this.getBuiltInOverrides();
    doc.overrides = overrides;
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  // ===== Ignore List =====

  async getIgnoreList(): Promise<IgnoreListDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        SCANNER_SETTINGS_COLLECTION,
        IGNORE_LIST_DOC_ID
      )) as IgnoreListDocument;
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: IgnoreListDocument = {
        id: IGNORE_LIST_DOC_ID,
        entries: [],
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(SCANNER_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async addIgnoreEntry(entry: IgnoreEntry): Promise<IgnoreListDocument> {
    const doc = await this.getIgnoreList();
    const exists = doc.entries.some(
      (e) =>
        e.variableGroupId === entry.variableGroupId &&
        e.variableName === entry.variableName &&
        e.patternName === entry.patternName
    );
    if (exists) return doc;

    doc.entries.push(entry);
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  async addIgnoreEntries(entries: IgnoreEntry[]): Promise<IgnoreListDocument> {
    const doc = await this.getIgnoreList();
    const existingKeys = new Set(
      doc.entries.map((e) => `${e.variableGroupId}::${e.variableName}::${e.patternName}`)
    );

    for (const entry of entries) {
      const key = `${entry.variableGroupId}::${entry.variableName}::${entry.patternName}`;
      if (!existingKeys.has(key)) {
        doc.entries.push(entry);
        existingKeys.add(key);
      }
    }

    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  async removeIgnoreEntry(entryId: string): Promise<IgnoreListDocument> {
    const doc = await this.getIgnoreList();
    const idx = doc.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) throw new Error(`Ignore entry "${entryId}" not found.`);
    doc.entries.splice(idx, 1);
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  async clearIgnoreList(): Promise<IgnoreListDocument> {
    // Read existing doc first to preserve __etag for version tracking
    const doc = await this.getIgnoreList();
    doc.entries = [];
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  // ===== Scan History (Enhancement #9) =====

  async getScanHistory(): Promise<ScanHistoryDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        SCANNER_SETTINGS_COLLECTION,
        SCAN_HISTORY_DOC_ID
      )) as ScanHistoryDocument;
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: ScanHistoryDocument = {
        id: SCAN_HISTORY_DOC_ID,
        entries: [],
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(SCANNER_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async addScanHistoryEntry(entry: ScanHistoryEntry): Promise<ScanHistoryDocument> {
    const doc = await this.getScanHistory();

    // Compare with the most recent scan for delta detection
    if (doc.entries.length > 0) {
      const previous = doc.entries[0]; // Most recent is first
      const prevTotal = previous.totalFindings;
      const currentTotal = entry.totalFindings;

      if (currentTotal > prevTotal) {
        entry.newFindings = currentTotal - prevTotal;
        entry.resolvedFindings = 0;
      } else if (currentTotal < prevTotal) {
        entry.newFindings = 0;
        entry.resolvedFindings = prevTotal - currentTotal;
      } else {
        entry.newFindings = 0;
        entry.resolvedFindings = 0;
      }
    }

    // Insert at the beginning (most recent first)
    doc.entries.unshift(entry);

    // Keep only the last N entries
    if (doc.entries.length > MAX_SCAN_HISTORY_ENTRIES) {
      doc.entries = doc.entries.slice(0, MAX_SCAN_HISTORY_ENTRIES);
    }

    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, doc);
    return doc;
  }

  // ===== Project-Scoped Settings (Enhancement #13) =====

  async getProjectSettings(projectId: string): Promise<ProjectSettingsDocument> {
    const docId = `${PROJECT_SETTINGS_DOC_PREFIX}${projectId}`;
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        SCANNER_SETTINGS_COLLECTION,
        docId
      )) as ProjectSettingsDocument;
    } catch (err) {
      if (!isDocumentNotFound(err)) throw err;
      const seed: ProjectSettingsDocument = {
        id: docId,
        projectId,
        ignoreEntries: [],
        customPatterns: [],
        builtInOverrides: [],
        inheritOrgDefaults: true,
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(SCANNER_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async saveProjectSettings(settings: ProjectSettingsDocument): Promise<ProjectSettingsDocument> {
    const manager = await this.getDataManager();
    await manager.setDocument(SCANNER_SETTINGS_COLLECTION, settings);
    return settings;
  }

  /**
   * Returns the effective ignore entries for a project.
   * If the project inherits org defaults, merges org-level and project-level entries.
   */
  async getEffectiveIgnoreEntries(projectId: string): Promise<IgnoreEntry[]> {
    const projectSettings = await this.getProjectSettings(projectId);

    if (projectSettings.inheritOrgDefaults) {
      const orgDoc = await this.getIgnoreList();
      const orgKeys = new Set(
        orgDoc.entries.map((e) => `${e.variableGroupId}::${e.variableName}::${e.patternName}`)
      );

      // Merge: project entries override org entries for the same key
      const merged = [...orgDoc.entries];
      for (const entry of projectSettings.ignoreEntries) {
        const key = `${entry.variableGroupId}::${entry.variableName}::${entry.patternName}`;
        if (!orgKeys.has(key)) {
          merged.push(entry);
        }
      }

      return merged;
    }

    return projectSettings.ignoreEntries;
  }

  /**
   * Returns the effective custom patterns for a project.
   * If the project inherits org defaults, merges org-level and project-level patterns.
   */
  async getEffectiveCustomPatterns(projectId: string): Promise<CustomPatternDefinition[]> {
    const projectSettings = await this.getProjectSettings(projectId);

    if (projectSettings.inheritOrgDefaults) {
      const orgDoc = await this.getCustomPatterns();
      const orgNames = new Set(orgDoc.patterns.map((p) => p.name));

      // Project patterns override org patterns with the same name
      const merged = [...orgDoc.patterns];
      for (const pattern of projectSettings.customPatterns) {
        if (!orgNames.has(pattern.name)) {
          merged.push(pattern);
        }
      }

      return merged;
    }

    return projectSettings.customPatterns;
  }

  /**
   * Returns the effective built-in overrides for a project.
   * If the project inherits org defaults, merges org-level and project-level overrides.
   */
  async getEffectiveBuiltInOverrides(projectId: string): Promise<BuiltInPatternOverride[]> {
    const projectSettings = await this.getProjectSettings(projectId);

    if (projectSettings.inheritOrgDefaults) {
      const orgDoc = await this.getBuiltInOverrides();
      const orgMap = new Map(orgDoc.overrides.map((o) => [o.patternName, o]));

      // Project overrides take precedence
      for (const override of projectSettings.builtInOverrides) {
        orgMap.set(override.patternName, override);
      }

      return Array.from(orgMap.values());
    }

    return projectSettings.builtInOverrides;
  }
}
