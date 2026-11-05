// Mock for azure-devops-extension-api and all its subpaths
// The moduleNameMapper redirects all "azure-devops-extension-api*" here

const mockClients: Record<string, any> = {};

export const CommonServiceIds = {
  ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
  ExtensionDataService: "ms.vss-features.extension-data-service",
};

export class TaskAgentRestClient {
  static _mockName = "TaskAgentRestClient";
}

export class BuildRestClient {
  static _mockName = "BuildRestClient";
}

export class GitRestClient {
  static _mockName = "GitRestClient";
}

// Re-export types that tests import from subpaths
export interface VariableGroup {
  id: number;
  name: string;
  description: string;
  type: string;
  variables: Record<string, VariableValue>;
}

export interface VariableValue {
  value: string;
  isSecret: boolean;
  isReadOnly: boolean;
}

// Stub interfaces for TypeScript imports
export interface IExtensionDataService {
  getExtensionDataManager(extensionId: string, accessToken: string): Promise<IExtensionDataManager>;
}

export interface IExtensionDataManager {
  getDocument(collectionName: string, id: string): Promise<any>;
  setDocument(collectionName: string, doc: any): Promise<any>;
}

export function getClient(clientClass: any): any {
  if (!clientClass) return {};
  const name = clientClass._mockName || clientClass.name || "unknown";
  if (!mockClients[name]) {
    mockClients[name] = {};
  }
  return mockClients[name];
}

export function __setMockClient(name: string, client: any): void {
  mockClients[name] = client;
}

export function __resetMockClients(): void {
  for (const key of Object.keys(mockClients)) {
    delete mockClients[key];
  }
}
