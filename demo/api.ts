// Sample data for the demo build: a fictional "Contoso" project with thirteen
// variable groups, five YAML pipelines and a few saved settings. Every value that
// looks like a secret is a documented fake (AKIAIOSFODNN7EXAMPLE, "xoxb-0000-EXAMPLE",
// "Password=Example123!" and the like). See demo/kit.ts for the helpers.
import {
  CommonServiceIds,
  clientFactory,
  delay,
  extensionDataService,
  projectPageService,
} from "./kit";

export { CommonServiceIds };

const DAY = 86_400_000;
const now = Date.now();
const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();

// ---------------------------------------------------------------------------
// Variable groups
// ---------------------------------------------------------------------------

type Variable = { value?: string; isSecret: boolean };
const plain = (value: string): Variable => ({ value, isSecret: false });
// Azure DevOps never returns the value of a secret variable.
const secret = (): Variable => ({ isSecret: true });

const group = (
  id: number,
  name: string,
  description: string,
  variables: Record<string, Variable>,
  type = "Vsts"
) => ({ id, name, description, type, variables, variableGroupProjectReferences: [] });

// Fake storage key: 86 base64 characters and "==", all of it the word EXAMPLE.
const fakeStorageKey = "EXAMPLE".repeat(13).slice(0, 86) + "==";

const groups = [
  group(12, "billing-api-prod", "Production settings for the billing API", {
    BillingApiUrl: plain("https://billing.contoso.com"),
    LogLevel: plain("Warning"),
    CacheTtlMinutes: plain("15"),
    FeatureInvoiceExport: plain("true"),
    StorageConnectionString: plain(
      "DefaultEndpointsProtocol=https;AccountName=contosoexample;EndpointSuffix=core.windows.net;AccountKey=EXAMPLE"
    ),
    PaymentGatewayApiKey: plain("example-gateway-key-0000"),
    InvoiceSigningKey: plain("example-signing-key"),
    LegacyAdminPassword: plain("example"),
    DbAdminPassword: secret(),
    JwtSecret: secret(),
    StripeWebhookSecret: secret(),
  }),
  group(14, "payments-worker-prod", "Queue and storage settings for the payments worker", {
    QueueName: plain("payments-events"),
    WorkerConcurrency: plain("4"),
    RetryLimit: plain("5"),
    S3UploadKeyId: plain("AKIAIOSFODNN7EXAMPLE"),
    S3UploadSecretValue: plain("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
    WorkerToken: plain("wkr-example"),
    SftpPassword: plain("changeme"),
    ServiceBusConnectionString: secret(),
    LedgerDbPassword: secret(),
  }),
  group(15, "web-portal-prod", "Production settings for the customer portal", {
    PortalBaseUrl: plain("https://portal.contoso.com"),
    CdnHost: plain("cdn.contoso.com"),
    AnalyticsEnabled: plain("true"),
    SlackBotToken: plain("xoxb-0000-EXAMPLE"),
    PartnerFeedAccess: plain("ctso_EXAMPLEEXAMPLEEXAMPLE"),
    SessionSecret: secret(),
    OidcClientSecret: secret(),
  }),
  group(16, "web-portal-staging", "Staging settings for the customer portal", {
    PortalBaseUrl: plain("https://portal-staging.contoso.com"),
    CdnHost: plain("cdn-staging.contoso.com"),
    TenantId: plain("00000000-0000-0000-0000-000000000000"),
    LogAnalyticsClientId: plain("11111111-1111-1111-1111-111111111111"),
    ReportsLogin: plain("Password=Example123!"),
    UploadsContainerKey: plain(fakeStorageKey),
    SessionSecret: secret(),
  }),
  group(17, "notifications-svc-staging", "Mail and push settings for notifications", {
    SmtpHost: plain("smtp.contoso.com"),
    SmtpPort: plain("587"),
    FromAddress: plain("no-reply@contoso.com"),
    SmtpPassword: plain("changeme"),
    PushQueueUrl: plain(
      "https://contosoexample.queue.core.windows.net/push?sv=2022-11-02&sp=r&sig=EXAMPLE"
    ),
    PushSigningKey: secret(),
  }),
  group(19, "legacy-reporting-dev", "Old reporting database, scheduled for removal", {
    ReportingUser: plain("reports"),
    ReportingDbPassword: plain("example-pass"),
    ReportingFeedUrl: plain("https://reports:example-pass@feeds.contoso.com/index.json"),
  }),
  group(18, "monitoring-shared", "Shared monitoring and alerting settings", {
    LogRetentionDays: plain("30"),
    AlertEmail: plain("oncall@contoso.com"),
    AzureSubscriptionId: plain("33333333-3333-3333-3333-333333333333"),
    AppInsightsInstrumentationKey: plain("22222222-2222-2222-2222-222222222222"),
    GrafanaApiKey: plain("example-grafana-key-not-real"),
    PagerDutyRoutingKey: secret(),
  }),
  group(11, "ci-build-settings", "Shared build settings", {
    BuildConfiguration: plain("Release"),
    NodeVersion: plain("20.x"),
    DotNetSdk: plain("8.0.x"),
    ArtifactFeed: plain("contoso-packages"),
    VersionPrefix: plain("1.4"),
    RunAnalyzers: plain("true"),
  }),
  group(13, "feature-flags-prod", "Feature switches for production", {
    FlagNewCheckout: plain("true"),
    FlagInvoiceExport: plain("true"),
    FlagPartnerPortal: plain("false"),
    FlagDarkMode: plain("true"),
    FlagBulkArchive: plain("false"),
  }),
  group(21, "docker-registry", "Container registry sign-in", {
    RegistryUrl: plain("contoso.azurecr.io"),
    RegistryUser: plain("build-agent"),
    RegistryPassword: secret(),
  }),
  group(22, "payments-worker-staging", "Queue and storage settings, staging", {
    QueueName: plain("payments-events-staging"),
    WorkerConcurrency: plain("2"),
    ServiceBusConnectionString: secret(),
    LedgerDbPassword: secret(),
  }),
  group(23, "billing-api-staging", "Staging settings for the billing API", {
    BillingApiUrl: plain("https://billing-staging.contoso.com"),
    LogLevel: plain("Information"),
    DbAdminPassword: secret(),
    JwtSecret: secret(),
  }),
  group(
    20,
    "shared-infra-kv",
    "Linked to the contoso-shared Key Vault",
    Object.fromEntries(
      [
        "SqlAdminPassword",
        "StorageAccountKey",
        "ServiceBusKey",
        "RedisPrimaryKey",
        "SigningCertPassword",
        "SmtpRelayPassword",
        "VpnSharedKey",
        "BackupEncryptionKey",
      ].map((name) => [name, secret()])
    ),
    "AzureKeyVault"
  ),
];

const byId = new Map(groups.map((g) => [g.id, g]));

// ---------------------------------------------------------------------------
// YAML pipelines. Each one lists the groups it uses, which is all the scanner reads.
// ---------------------------------------------------------------------------

const pipeline = (id: number, name: string, repo: string, used: string[]) => ({
  id,
  name,
  repo,
  yaml: `variables:\n${used.map((g) => `  - group: ${g}`).join("\n")}\n\nsteps:\n  - script: echo build\n`,
});

const pipelines = [
  pipeline(101, "billing-api CI", "billing-api", [
    "ci-build-settings",
    "billing-api-staging",
    "billing-api-prod",
  ]),
  pipeline(102, "web-portal CI/CD", "web-portal", [
    "ci-build-settings",
    "web-portal-staging",
    "web-portal-prod",
    "feature-flags-prod",
    "monitoring-shared",
  ]),
  pipeline(103, "payments-worker CI/CD", "payments-worker", [
    "ci-build-settings",
    "payments-worker-staging",
    "payments-worker-prod",
    "shared-infra-kv",
  ]),
  pipeline(104, "notifications-svc", "notifications-svc", [
    "notifications-svc-staging",
    "docker-registry",
  ]),
  pipeline(105, "infra-deploy", "infra", ["shared-infra-kv", "monitoring-shared"]),
];

const repoId = (repo: string) => `repo-${repo}`;
const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
const yamlByRepo = new Map(pipelines.map((p) => [repoId(p.repo), p.yaml]));

// ---------------------------------------------------------------------------
// Saved settings, so the tabs have something in them. All stored for the organisation.
// ---------------------------------------------------------------------------

const historyEntry = (
  id: string,
  daysAgo: number,
  totalFindings: number,
  totalVariables: number,
  totalAlreadySecret: number,
  findingsByRepo: Record<string, number>,
  delta?: { newFindings: number; resolvedFindings: number }
) => ({
  id,
  scannedAt: iso(daysAgo),
  totalGroups: 13,
  totalVariables,
  totalAlreadySecret,
  totalFindings,
  findingsByRepo,
  ...delta,
});

const settings = extensionDataService({
  SecretScannerSettings: {
    "custom-patterns": {
      version: 1,
      patterns: [
        {
          id: "cp-1",
          name: "contoso-service-token",
          description: "Value looks like a Contoso partner feed token (ctso_ prefix)",
          severity: "high",
          matchTarget: "variable-value",
          regexSource: "^ctso_[A-Za-z0-9]{20,}$",
          regexFlags: "",
          enabled: true,
          createdAt: iso(40),
        },
        {
          id: "cp-2",
          name: "database-login-name",
          description: "Variable name contains a database login or user",
          severity: "medium",
          matchTarget: "variable-name",
          regexSource: "(?:db|sql)[_-]?(?:login|user)",
          regexFlags: "i",
          enabled: true,
          createdAt: iso(25),
        },
      ],
    },
    "builtin-pattern-overrides": {
      version: 1,
      overrides: [
        { patternName: "api-key-name", enabled: true, severity: "high" },
        { patternName: "credential-name", enabled: false },
        { patternName: "subscription-id-name", enabled: false },
        { patternName: "instrumentation-key-name", enabled: true, severity: "low" },
      ],
    },
    "ignore-list": {
      version: 1,
      entries: [
        {
          id: "ig-1",
          variableGroupId: 16,
          variableGroupName: "web-portal-staging",
          variableName: "LogAnalyticsClientId",
          patternName: "client-id-name",
          reason: "Public app registration id, not a secret",
          ignoredAt: iso(12),
          ignoredBy: "Priya Shah",
        },
        {
          id: "ig-2",
          variableGroupId: 18,
          variableGroupName: "monitoring-shared",
          variableName: "GrafanaApiKey",
          patternName: "api-key-name",
          reason: "Read-only dashboard key, rotated monthly",
          ignoredAt: iso(5),
          ignoredBy: "Tom Ellis",
          expiresAt: iso(-45),
        },
        {
          id: "ig-3",
          variableGroupId: 19,
          variableGroupName: "legacy-reporting-dev",
          variableName: "ReportingDbPassword",
          patternName: "password-name",
          reason: "Dev only, group is being deleted",
          ignoredAt: iso(40),
          ignoredBy: "Maria Lopez",
          expiresAt: iso(6),
        },
      ],
    },
    "scan-history": {
      version: 1,
      entries: [
        historyEntry("sh-5", 2.12, 21, 75, 22, { "billing-api-prod": 4, "web-portal-prod": 3 }, {
          newFindings: 0,
          resolvedFindings: 4,
        }),
        historyEntry("sh-4", 9.4, 25, 72, 20, { "billing-api-prod": 5, "web-portal-prod": 4 }, {
          newFindings: 0,
          resolvedFindings: 6,
        }),
        historyEntry("sh-3", 16.65, 31, 70, 18, { "billing-api-prod": 6, "web-portal-prod": 4 }, {
          newFindings: 0,
          resolvedFindings: 0,
        }),
        historyEntry("sh-2", 23.3, 31, 68, 16, { "billing-api-prod": 6, "web-portal-prod": 4 }, {
          newFindings: 0,
          resolvedFindings: 3,
        }),
        historyEntry("sh-1", 30.8, 34, 66, 13, { "billing-api-prod": 7, "web-portal-prod": 5 }),
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// What the hub asks the host for
// ---------------------------------------------------------------------------

const locationService = {
  getServiceLocation: () => Promise.resolve("https://dev.azure.com/contoso/"),
};

export const services: Record<string, unknown> = {
  [CommonServiceIds.ProjectPageService]: projectPageService("Contoso"),
  [CommonServiceIds.LocationService]: locationService,
  [CommonServiceIds.ExtensionDataService]: settings,
};

export const getClient = clientFactory({
  TaskAgentRestClient: {
    getVariableGroups: () => delay(groups, 350),
    getVariableGroup: (_project: string, id: number) => delay(byId.get(id), 120),
    // Marking a variable as secret drops its value, as Azure DevOps does.
    updateVariableGroup: (params: any, id: number) => {
      const target = byId.get(id)!;
      for (const variable of Object.values<Variable>(params.variables)) {
        if (variable.isSecret) delete variable.value;
      }
      target.variables = params.variables;
      return delay(target, 200);
    },
  },
  BuildRestClient: {
    getDefinitions: () => delay(pipelines.map(({ id, name }) => ({ id, name })), 250),
    getDefinition: (_project: string, id: number) => {
      const p = pipelineById.get(id)!;
      return delay(
        {
          id: p.id,
          name: p.name,
          process: { yamlFilename: "azure-pipelines.yml" },
          repository: { id: repoId(p.repo), name: p.repo },
        },
        120
      );
    },
  },
  GitRestClient: {
    getItemText: (repo: string) => delay(yamlByRepo.get(repo) ?? "", 120),
  },
});
