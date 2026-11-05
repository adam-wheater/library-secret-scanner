import { getClient } from "azure-devops-extension-api";
import {
  TaskAgentRestClient,
  VariableGroup,
  VariableGroupParameters,
} from "azure-devops-extension-api/TaskAgent";
import { BuildRestClient } from "azure-devops-extension-api/Build/BuildClient";
import { BuildDefinitionReference, YamlProcess } from "azure-devops-extension-api/Build/Build";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import { VariableEntry } from "./SecretPatternMatcher";
import { SECRET_GROUP_NAME_PATTERNS } from "../utils/constants";

let agentClient: TaskAgentRestClient | null = null;

function getAgentClient(): TaskAgentRestClient {
  if (!agentClient) {
    agentClient = getClient(TaskAgentRestClient);
  }
  return agentClient;
}

export function resetClient(): void {
  agentClient = null;
}

/**
 * Fetches all variable groups for the given project.
 */
export async function getVariableGroups(project: string): Promise<VariableGroup[]> {
  try {
    return await getAgentClient().getVariableGroups(project);
  } catch (error) {
    console.error(`Failed to get variable groups for project "${project}":`, error);
    throw error;
  }
}

/**
 * Converts an Azure DevOps VariableGroup's variables map into a flat array
 * of VariableEntry objects suitable for scanning.
 */
export function extractVariables(group: VariableGroup): VariableEntry[] {
  const entries: VariableEntry[] = [];
  const variables = group.variables;

  if (!variables) return entries;

  for (const [name, variable] of Object.entries(variables)) {
    entries.push({
      name,
      value: variable.value ?? "",
      isSecret: variable.isSecret ?? false,
    });
  }

  return entries;
}

/**
 * Returns summary metadata about a variable group.
 */
export function getGroupMetadata(group: VariableGroup): {
  id: number;
  name: string;
  description: string;
  type: string;
  variableCount: number;
  secretCount: number;
} {
  const variables = group.variables ?? {};
  const entries = Object.values(variables);

  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    type: group.type ?? "Vsts",
    variableCount: entries.length,
    secretCount: entries.filter((v) => v.isSecret).length,
  };
}

/**
 * Fetches a single variable group by ID.
 */
export async function getVariableGroup(project: string, groupId: number): Promise<VariableGroup> {
  try {
    return await getAgentClient().getVariableGroup(project, groupId);
  } catch (error) {
    console.error(`Failed to get variable group ${groupId} for project "${project}":`, error);
    throw error;
  }
}

/**
 * Marks the specified variables as secret in a variable group.
 * Uses a fetch-mutate-PUT pattern to avoid stale data.
 * Returns the names of variables that were not found in the group.
 */
export async function markVariablesAsSecret(
  project: string,
  groupId: number,
  variableNames: string[]
): Promise<{ updated: string[]; notFound: string[] }> {
  const group = await getVariableGroup(project, groupId);
  const variables = group.variables ?? {};

  const updated: string[] = [];
  const notFound: string[] = [];

  for (const name of variableNames) {
    if (variables[name]) {
      variables[name].isSecret = true;
      updated.push(name);
    } else {
      notFound.push(name);
      console.warn(`Variable "${name}" not found in group ${groupId} ("${group.name}")`);
    }
  }

  if (notFound.length > 0 && updated.length === 0) {
    return { updated, notFound };
  }

  const params: VariableGroupParameters = {
    name: group.name,
    description: group.description ?? "",
    type: group.type ?? "Vsts",
    providerData: group.providerData,
    variableGroupProjectReferences: group.variableGroupProjectReferences ?? [],
    variables,
  };

  await getAgentClient().updateVariableGroup(params, groupId);

  return { updated, notFound };
}

export interface PipelineReference {
  pipelineName: string;
  repoName: string;
}

// New syntax: `- group: my-group` (at any nesting level — top, stage, job, deployment)
const NEW_SYNTAX_REGEX = /-\s*group:\s*['"]?([^\s'"#]+)/g;

// Old syntax: `variableGroups:` block followed by bare `- name` list items.
// We detect the block header, then capture subsequent `- name` lines at the
// same or deeper indentation until a line that doesn't match.
const OLD_SYNTAX_BLOCK_REGEX = /^(\s*)variableGroups:\s*$/gm;

/**
 * Extracts all variable group names referenced in a YAML pipeline file.
 * Handles both syntaxes at any nesting level:
 *   New: `variables: \n - group: my-group`
 *   Old: `variableGroups: \n - my-group`
 */
export function extractGroupNamesFromYaml(yaml: string): string[] {
  const names = new Set<string>();

  // 1) New syntax — works at all nesting levels (top, stage, job, deployment)
  for (const match of yaml.matchAll(NEW_SYNTAX_REGEX)) {
    names.add(match[1]);
  }

  // 2) Old syntax — `variableGroups:` followed by bare `- name` list items
  for (const blockMatch of yaml.matchAll(OLD_SYNTAX_BLOCK_REGEX)) {
    const blockIndent = blockMatch[1].length;
    const startIdx = blockMatch.index! + blockMatch[0].length;
    const rest = yaml.substring(startIdx);
    const lines = rest.split("\n");

    for (const line of lines) {
      // Skip empty lines and comment-only lines
      if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
      // Check if this is a `- name` list item at the correct indentation
      const itemMatch = line.match(/^(\s*)-\s+['"]?([^\s'"#:]+)['"]?\s*$/);
      if (itemMatch && itemMatch[1].length > blockIndent) {
        names.add(itemMatch[2]);
        continue;
      }
      // Any non-empty, non-comment line that isn't a list item ends the block
      break;
    }
  }

  return Array.from(names);
}

// --- Enhancement #10: Detect variable group references that suggest secret storage ---

export interface VariableGroupSecretWarning {
  groupName: string;
  pipelineName: string;
  repoName: string;
  reason: string;
}

/**
 * Checks variable group names referenced in pipelines and flags those
 * whose names suggest they contain secrets (e.g. names containing
 * "secret", "credential", "key-vault", etc.).
 */
export function detectSecretVariableGroupReferences(
  usageMap: Map<string, PipelineReference[]>
): VariableGroupSecretWarning[] {
  const warnings: VariableGroupSecretWarning[] = [];

  for (const [groupName, refs] of usageMap.entries()) {
    const matchedPattern = SECRET_GROUP_NAME_PATTERNS.find((p) => p.test(groupName));
    if (matchedPattern) {
      for (const ref of refs) {
        warnings.push({
          groupName,
          pipelineName: ref.pipelineName,
          repoName: ref.repoName,
          reason: `Variable group name "${groupName}" suggests secret storage (matched: ${matchedPattern.source})`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Scans all pipeline YAML files to find which variable groups are referenced.
 * Returns a map of variable group name -> list of pipelines that use it.
 */
export async function getPipelineVariableGroupUsage(
  project: string,
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<Map<string, PipelineReference[]>> {
  const buildClient = getClient(BuildRestClient);
  const gitClient = getClient(GitRestClient);
  const usageMap = new Map<string, PipelineReference[]>();

  onProgress?.("Fetching pipeline definitions...", 0, 0);

  // Get all pipeline definitions. The service pages this list and hands back a
  // continuation token (surfaced by the client as a property on the array), so
  // a single call would silently stop at the first page on larger projects.
  const definitions: BuildDefinitionReference[] = [];
  let continuationToken: string | undefined;
  do {
    const page: BuildDefinitionReference[] & { continuationToken?: string | null } =
      await buildClient.getDefinitions(
        project,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        continuationToken
      );
    definitions.push(...page);
    continuationToken = page.continuationToken || undefined;
  } while (continuationToken);

  // Filter to YAML pipelines — those whose process has a yamlFilename
  const yamlPipelines: { name: string; repoId: string; repoName: string; yamlFile: string }[] = [];

  // Fetch full definitions to get process details (batched for performance)
  const BATCH_SIZE = 5;
  for (let i = 0; i < definitions.length; i += BATCH_SIZE) {
    const batch = definitions.slice(i, i + BATCH_SIZE);
    onProgress?.("Fetching pipeline details...", i, definitions.length);

    const fullDefs = await Promise.all(
      batch.map((def) => buildClient.getDefinition(project, def.id).catch(() => null))
    );

    for (const fullDef of fullDefs) {
      if (!fullDef) continue;
      const process = fullDef.process as YamlProcess | undefined;
      if (process?.yamlFilename && fullDef.repository?.id) {
        yamlPipelines.push({
          name: fullDef.name,
          repoId: fullDef.repository.id,
          repoName: fullDef.repository.name ?? fullDef.repository.id,
          yamlFile: process.yamlFilename,
        });
      }
    }
  }

  // Fetch YAML files and parse for group references
  for (let i = 0; i < yamlPipelines.length; i += BATCH_SIZE) {
    const batch = yamlPipelines.slice(i, i + BATCH_SIZE);
    onProgress?.("Scanning pipeline YAML files...", i, yamlPipelines.length);

    const contents = await Promise.all(
      batch.map((p) =>
        gitClient
          .getItemText(p.repoId, "/" + p.yamlFile.replace(/^\//, ""), project)
          .catch(() => null)
      )
    );

    for (let j = 0; j < batch.length; j++) {
      const yaml = contents[j];
      if (!yaml) continue;

      const pipeline = batch[j];
      const groupNames = extractGroupNamesFromYaml(yaml);

      for (const groupName of groupNames) {
        let refs = usageMap.get(groupName);
        if (!refs) {
          refs = [];
          usageMap.set(groupName, refs);
        }
        // Avoid duplicate entries for the same pipeline
        if (!refs.some((r) => r.pipelineName === pipeline.name)) {
          refs.push({ pipelineName: pipeline.name, repoName: pipeline.repoName });
        }
      }
    }
  }

  onProgress?.("Pipeline scan complete.", yamlPipelines.length, yamlPipelines.length);
  return usageMap;
}
