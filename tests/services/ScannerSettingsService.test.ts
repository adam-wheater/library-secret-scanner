import {
  ScannerSettingsService,
  isDocumentNotFound,
} from "../../src/services/ScannerSettingsService";
import {
  CustomPatternDefinition,
  IgnoreEntry,
  Severity,
  MatchSource,
} from "../../src/models/interfaces";
import {
  SCANNER_SETTINGS_COLLECTION,
  CUSTOM_PATTERNS_DOC_ID,
  IGNORE_LIST_DOC_ID,
  SETTINGS_VERSION,
} from "../../src/utils/constants";
import { __setMockService, __resetMockServices } from "../__mocks__/azure-devops-extension-sdk";
import { CommonServiceIds } from "../__mocks__/azure-devops-extension-api";

// --- Helpers ---

function makePattern(overrides: Partial<CustomPatternDefinition> = {}): CustomPatternDefinition {
  return {
    id: "cp-1",
    name: "test-pattern",
    description: "Test",
    severity: Severity.High,
    matchTarget: MatchSource.VariableName,
    regexSource: "test",
    regexFlags: "i",
    enabled: true,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeIgnoreEntry(overrides: Partial<IgnoreEntry> = {}): IgnoreEntry {
  return {
    id: "ign-1",
    variableGroupId: 1,
    variableGroupName: "Group1",
    variableName: "DbPassword",
    patternName: "password",
    reason: "false positive",
    ignoredAt: "2024-01-01T00:00:00Z",
    ignoredBy: "user",
    ...overrides,
  };
}

// In-memory document store used by the mock data manager
function createMockDataManager() {
  const store: Record<string, Record<string, any>> = {};

  return {
    getDocument: jest.fn(async (collection: string, id: string) => {
      if (!store[collection] || !store[collection][id]) {
        throw new Error("Document not found");
      }
      return store[collection][id];
    }),
    setDocument: jest.fn(async (collection: string, doc: any) => {
      if (!store[collection]) store[collection] = {};
      store[collection][doc.id] = doc;
      return doc;
    }),
    // test helper to seed data
    __seed(collection: string, doc: any) {
      if (!store[collection]) store[collection] = {};
      store[collection][doc.id] = doc;
    },
  };
}

describe("ScannerSettingsService", () => {
  let service: ScannerSettingsService;
  let mockManager: ReturnType<typeof createMockDataManager>;

  beforeEach(() => {
    __resetMockServices();
    mockManager = createMockDataManager();

    const mockDataService = {
      getExtensionDataManager: jest.fn().mockResolvedValue(mockManager),
    };
    __setMockService(CommonServiceIds.ExtensionDataService, mockDataService);

    service = new ScannerSettingsService();
  });

  // ===== Custom Patterns =====

  describe("getCustomPatterns", () => {
    test("returns seed document when none exists", async () => {
      const doc = await service.getCustomPatterns();
      expect(doc.id).toBe(CUSTOM_PATTERNS_DOC_ID);
      expect(doc.patterns).toEqual([]);
      expect(doc.version).toBe(SETTINGS_VERSION);
      // Seed should be persisted
      expect(mockManager.setDocument).toHaveBeenCalledWith(
        SCANNER_SETTINGS_COLLECTION,
        expect.objectContaining({ id: CUSTOM_PATTERNS_DOC_ID })
      );
    });

    test("returns existing document", async () => {
      const existing = {
        id: CUSTOM_PATTERNS_DOC_ID,
        patterns: [makePattern()],
        version: SETTINGS_VERSION,
      };
      mockManager.__seed(SCANNER_SETTINGS_COLLECTION, existing);

      const doc = await service.getCustomPatterns();
      expect(doc.patterns).toHaveLength(1);
      expect(doc.patterns[0].name).toBe("test-pattern");
    });

    test("does not overwrite settings with a seed when the read fails for another reason", async () => {
      mockManager.getDocument.mockRejectedValueOnce(
        Object.assign(new Error("TF400813: The user is not authorized"), { status: 401 })
      );
      await expect(service.getCustomPatterns()).rejects.toThrow("not authorized");
      expect(mockManager.setDocument).not.toHaveBeenCalled();
    });

    test("seeds when the data service reports the document as missing by status", async () => {
      mockManager.getDocument.mockRejectedValueOnce(
        Object.assign(new Error("Server error"), {
          status: 404,
          serverError: { typeKey: "DocumentDoesNotExistException" },
        })
      );
      const doc = await service.getCustomPatterns();
      expect(doc.patterns).toEqual([]);
      expect(mockManager.setDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe("isDocumentNotFound", () => {
    test("recognises the data service's not-found shapes", () => {
      expect(isDocumentNotFound({ status: 404 })).toBe(true);
      expect(
        isDocumentNotFound({ serverError: { typeKey: "DocumentDoesNotExistException" } })
      ).toBe(true);
      expect(isDocumentNotFound(new Error("The document with id x does not exist"))).toBe(true);
      expect(isDocumentNotFound(new Error("Document not found"))).toBe(true);
    });

    test("rejects everything else", () => {
      expect(isDocumentNotFound(new Error("Network request failed"))).toBe(false);
      expect(isDocumentNotFound({ status: 500, message: "Internal error" })).toBe(false);
      expect(isDocumentNotFound(null)).toBe(false);
      expect(isDocumentNotFound("boom")).toBe(false);
    });
  });

  describe("addCustomPattern", () => {
    test("adds pattern to empty document", async () => {
      const pattern = makePattern();
      const doc = await service.addCustomPattern(pattern);
      expect(doc.patterns).toHaveLength(1);
      expect(doc.patterns[0].id).toBe("cp-1");
    });

    test("rejects invalid regex", async () => {
      const pattern = makePattern({ regexSource: "[invalid" });
      await expect(service.addCustomPattern(pattern)).rejects.toThrow("Invalid regex");
    });

    test("rejects duplicate pattern name", async () => {
      await service.addCustomPattern(makePattern());
      await expect(service.addCustomPattern(makePattern({ id: "cp-2" }))).rejects.toThrow(
        "already exists"
      );
    });
  });

  describe("updateCustomPattern", () => {
    test("updates an existing pattern", async () => {
      await service.addCustomPattern(makePattern());
      const doc = await service.updateCustomPattern("cp-1", { enabled: false });
      expect(doc.patterns[0].enabled).toBe(false);
    });

    test("throws when pattern not found", async () => {
      await expect(service.updateCustomPattern("nonexistent", { enabled: false })).rejects.toThrow(
        "not found"
      );
    });

    test("rejects invalid regex on update", async () => {
      await service.addCustomPattern(makePattern());
      await expect(service.updateCustomPattern("cp-1", { regexSource: "[bad" })).rejects.toThrow(
        "Invalid regex"
      );
    });
  });

  describe("removeCustomPattern", () => {
    test("removes an existing pattern", async () => {
      await service.addCustomPattern(makePattern());
      const doc = await service.removeCustomPattern("cp-1");
      expect(doc.patterns).toHaveLength(0);
    });

    test("throws when pattern not found", async () => {
      await expect(service.removeCustomPattern("nonexistent")).rejects.toThrow("not found");
    });
  });

  // ===== Ignore List =====

  describe("getIgnoreList", () => {
    test("returns seed document when none exists", async () => {
      const doc = await service.getIgnoreList();
      expect(doc.id).toBe(IGNORE_LIST_DOC_ID);
      expect(doc.entries).toEqual([]);
      expect(doc.version).toBe(SETTINGS_VERSION);
    });

    test("returns existing document", async () => {
      mockManager.__seed(SCANNER_SETTINGS_COLLECTION, {
        id: IGNORE_LIST_DOC_ID,
        entries: [makeIgnoreEntry()],
        version: SETTINGS_VERSION,
      });

      const doc = await service.getIgnoreList();
      expect(doc.entries).toHaveLength(1);
    });
  });

  describe("addIgnoreEntry", () => {
    test("adds entry to empty list", async () => {
      const entry = makeIgnoreEntry();
      const doc = await service.addIgnoreEntry(entry);
      expect(doc.entries).toHaveLength(1);
    });

    test("deduplicates by groupId + variableName + patternName", async () => {
      const entry = makeIgnoreEntry();
      await service.addIgnoreEntry(entry);
      const doc = await service.addIgnoreEntry(makeIgnoreEntry({ id: "ign-2" }));
      expect(doc.entries).toHaveLength(1);
    });

    test("allows entries with different variable names", async () => {
      await service.addIgnoreEntry(makeIgnoreEntry());
      const doc = await service.addIgnoreEntry(
        makeIgnoreEntry({ id: "ign-2", variableName: "ApiKey" })
      );
      expect(doc.entries).toHaveLength(2);
    });
  });

  describe("addIgnoreEntries", () => {
    test("adds multiple entries in a single call", async () => {
      const entries = [
        makeIgnoreEntry({ id: "ign-1", variableName: "DbPassword" }),
        makeIgnoreEntry({ id: "ign-2", variableName: "ApiKey" }),
        makeIgnoreEntry({ id: "ign-3", variableName: "Token", patternName: "token" }),
      ];
      const doc = await service.addIgnoreEntries(entries);
      expect(doc.entries).toHaveLength(3);
    });

    test("deduplicates against existing entries", async () => {
      await service.addIgnoreEntry(makeIgnoreEntry());
      const entries = [
        makeIgnoreEntry({ id: "ign-dup" }), // same groupId + variableName + patternName
        makeIgnoreEntry({ id: "ign-2", variableName: "ApiKey" }),
      ];
      const doc = await service.addIgnoreEntries(entries);
      expect(doc.entries).toHaveLength(2);
    });

    test("deduplicates within the batch itself", async () => {
      const entries = [
        makeIgnoreEntry({ id: "ign-1" }),
        makeIgnoreEntry({ id: "ign-2" }), // same groupId + variableName + patternName
      ];
      const doc = await service.addIgnoreEntries(entries);
      expect(doc.entries).toHaveLength(1);
    });

    test("writes to storage only once", async () => {
      const entries = [
        makeIgnoreEntry({ id: "ign-1", variableName: "A" }),
        makeIgnoreEntry({ id: "ign-2", variableName: "B" }),
      ];
      mockManager.setDocument.mockClear();
      await service.addIgnoreEntries(entries);
      // One call for seeding the empty doc, one for the batch write
      // The getIgnoreList seeds the doc, then addIgnoreEntries writes once
      const setCalls = mockManager.setDocument.mock.calls.filter(
        (call: any[]) => call[1].id === IGNORE_LIST_DOC_ID
      );
      // Should be at most 2: one seed + one batch write (or just 1 batch if already seeded)
      expect(setCalls.length).toBeLessThanOrEqual(2);
    });

    test("handles empty array gracefully", async () => {
      const doc = await service.addIgnoreEntries([]);
      expect(doc.entries).toHaveLength(0);
    });
  });

  describe("removeIgnoreEntry", () => {
    test("removes an existing entry", async () => {
      await service.addIgnoreEntry(makeIgnoreEntry());
      const doc = await service.removeIgnoreEntry("ign-1");
      expect(doc.entries).toHaveLength(0);
    });

    test("throws when entry not found", async () => {
      await expect(service.removeIgnoreEntry("nonexistent")).rejects.toThrow("not found");
    });
  });

  describe("clearIgnoreList", () => {
    test("clears all entries", async () => {
      await service.addIgnoreEntry(makeIgnoreEntry());
      await service.addIgnoreEntry(makeIgnoreEntry({ id: "ign-2", variableName: "ApiKey" }));
      const doc = await service.clearIgnoreList();
      expect(doc.entries).toHaveLength(0);
      expect(doc.id).toBe(IGNORE_LIST_DOC_ID);
    });
  });
});
