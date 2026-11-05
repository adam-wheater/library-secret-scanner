import {
  extractVariables,
  getGroupMetadata,
  getPipelineVariableGroupUsage,
} from "../../src/scanning/LibraryGroupService";
import { VariableGroup } from "azure-devops-extension-api/TaskAgent";
import { __setMockClient, __resetMockClients } from "../__mocks__/azure-devops-extension-api";

function makeVar(value: string, isSecret: boolean) {
  return { value, isSecret, isReadOnly: false };
}

function makeGroup(overrides: Partial<VariableGroup> = {}): VariableGroup {
  return {
    id: 1,
    name: "Test Group",
    description: "A test variable group",
    type: "Vsts",
    variables: {
      Environment: makeVar("production", false),
      ApiKey: makeVar("", true),
      Region: makeVar("westeurope", false),
    },
    ...overrides,
  } as unknown as VariableGroup;
}

describe("extractVariables", () => {
  test("converts variable group variables to VariableEntry array", () => {
    const group = makeGroup();
    const entries = extractVariables(group);

    expect(entries).toHaveLength(3);

    const env = entries.find((e) => e.name === "Environment");
    expect(env).toBeDefined();
    expect(env!.value).toBe("production");
    expect(env!.isSecret).toBe(false);

    const apiKey = entries.find((e) => e.name === "ApiKey");
    expect(apiKey).toBeDefined();
    expect(apiKey!.value).toBe("");
    expect(apiKey!.isSecret).toBe(true);
  });

  test("handles group with no variables", () => {
    const group = makeGroup({ variables: undefined as any });
    const entries = extractVariables(group);
    expect(entries).toHaveLength(0);
  });

  test("handles empty variables object", () => {
    const group = makeGroup({ variables: {} });
    const entries = extractVariables(group);
    expect(entries).toHaveLength(0);
  });

  test("handles null value as empty string", () => {
    const group = makeGroup({
      variables: {
        NullVar: { value: null as any, isSecret: false, isReadOnly: false },
      },
    });
    const entries = extractVariables(group);
    expect(entries[0].value).toBe("");
  });

  test("handles missing isSecret as false", () => {
    const group = makeGroup({
      variables: {
        NoFlag: { value: "test", isReadOnly: false } as any,
      },
    });
    const entries = extractVariables(group);
    expect(entries[0].isSecret).toBe(false);
  });
});

describe("getGroupMetadata", () => {
  test("returns correct metadata for a standard group", () => {
    const group = makeGroup();
    const meta = getGroupMetadata(group);

    expect(meta.id).toBe(1);
    expect(meta.name).toBe("Test Group");
    expect(meta.description).toBe("A test variable group");
    expect(meta.type).toBe("Vsts");
    expect(meta.variableCount).toBe(3);
    expect(meta.secretCount).toBe(1);
  });

  test("returns correct counts for all-secret group", () => {
    const group = makeGroup({
      variables: {
        Secret1: makeVar("", true),
        Secret2: makeVar("", true),
      },
    });
    const meta = getGroupMetadata(group);
    expect(meta.variableCount).toBe(2);
    expect(meta.secretCount).toBe(2);
  });

  test("returns zero counts for empty group", () => {
    const group = makeGroup({ variables: {} });
    const meta = getGroupMetadata(group);
    expect(meta.variableCount).toBe(0);
    expect(meta.secretCount).toBe(0);
  });

  test("handles undefined variables", () => {
    const group = makeGroup({ variables: undefined as any });
    const meta = getGroupMetadata(group);
    expect(meta.variableCount).toBe(0);
    expect(meta.secretCount).toBe(0);
  });

  test("identifies AzureKeyVault type", () => {
    const group = makeGroup({ type: "AzureKeyVault" });
    const meta = getGroupMetadata(group);
    expect(meta.type).toBe("AzureKeyVault");
  });

  test("defaults missing description to empty string", () => {
    const group = makeGroup({ description: undefined as any });
    const meta = getGroupMetadata(group);
    expect(meta.description).toBe("");
  });

  test("defaults missing type to Vsts", () => {
    const group = makeGroup({ type: undefined as any });
    const meta = getGroupMetadata(group);
    expect(meta.type).toBe("Vsts");
  });
});

describe("getPipelineVariableGroupUsage", () => {
  afterEach(() => __resetMockClients());

  test("follows the continuation token until every definition page is read", async () => {
    const page1 = Object.assign([{ id: 1 }], { continuationToken: "tok-2" });
    const page2 = Object.assign([{ id: 2 }], { continuationToken: "tok-3" });
    const page3 = Object.assign([{ id: 3 }], { continuationToken: null });
    const getDefinitions = jest
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(page3);
    const getDefinition = jest.fn(async (_project: string, id: number) => ({
      id,
      name: `pipeline-${id}`,
      repository: { id: `repo-${id}`, name: `repo-${id}` },
      process: { yamlFilename: "azure-pipelines.yml" },
    }));
    __setMockClient("BuildRestClient", { getDefinitions, getDefinition });
    __setMockClient("GitRestClient", {
      getItemText: jest.fn(async (repoId: string) =>
        repoId === "repo-3"
          ? "variables:\n  - group: shared-secrets\n"
          : "variables:\n  - group: common\n"
      ),
    });

    const usage = await getPipelineVariableGroupUsage("proj");

    expect(getDefinitions).toHaveBeenCalledTimes(3);
    expect(getDefinitions.mock.calls[1][6]).toBe("tok-2");
    expect(getDefinitions.mock.calls[2][6]).toBe("tok-3");
    expect(getDefinition).toHaveBeenCalledTimes(3);
    expect(usage.get("common")?.map((r) => r.pipelineName)).toEqual(["pipeline-1", "pipeline-2"]);
    expect(usage.get("shared-secrets")?.map((r) => r.pipelineName)).toEqual(["pipeline-3"]);
  });

  test("stops after a single page when no continuation token is returned", async () => {
    const getDefinitions = jest.fn().mockResolvedValue([]);
    __setMockClient("BuildRestClient", { getDefinitions, getDefinition: jest.fn() });
    __setMockClient("GitRestClient", { getItemText: jest.fn() });

    const usage = await getPipelineVariableGroupUsage("proj");

    expect(getDefinitions).toHaveBeenCalledTimes(1);
    expect(usage.size).toBe(0);
  });
});
