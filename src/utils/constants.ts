import { Severity } from "../models/interfaces";

export interface SecretPattern {
  name: string;
  description: string;
  severity: Severity;
  /** Test against the variable name (case-insensitive). */
  namePattern?: RegExp;
  /** Test against the variable value. */
  valuePattern?: RegExp;
}

/**
 * Patterns that match on the **variable name** — if the name suggests a secret,
 * the value should be marked as secret regardless of what it contains.
 */
export const NAME_PATTERNS: SecretPattern[] = [
  {
    name: "password-name",
    description: "Variable name contains 'password' or 'passwd' or 'pwd'",
    severity: Severity.Critical,
    namePattern: /(?:password|passwd|pwd)(?:$|[^a-z])/i,
  },
  {
    name: "secret-name",
    description: "Variable name contains 'secret'",
    severity: Severity.Critical,
    namePattern: /secret/i,
  },
  {
    name: "api-key-name",
    description: "Variable name contains 'apikey', 'api-key', or 'api_key'",
    severity: Severity.Critical,
    namePattern: /api[_-]?key/i,
  },
  {
    name: "token-name",
    description: "Variable name contains 'token'",
    severity: Severity.High,
    namePattern: /token/i,
  },
  {
    name: "credential-name",
    description: "Variable name contains 'credential' or 'cred'",
    severity: Severity.High,
    namePattern: /(?:credential|cred)(?:$|[^a-z])/i,
  },
  {
    name: "connection-string-name",
    description: "Variable name contains 'connectionstring' or 'connection-string'",
    severity: Severity.Critical,
    namePattern: /connection[_-]?string/i,
  },
  {
    name: "private-key-name",
    description: "Variable name contains 'privatekey' or 'private-key'",
    severity: Severity.Critical,
    namePattern: /private[_-]?key/i,
  },
  {
    name: "access-key-name",
    description: "Variable name contains 'accesskey' or 'access-key'",
    severity: Severity.Critical,
    namePattern: /access[_-]?key/i,
  },
  {
    name: "signing-key-name",
    description: "Variable name contains 'signingkey' or 'signing-key'",
    severity: Severity.High,
    namePattern: /signing[_-]?key/i,
  },
  {
    name: "encryption-key-name",
    description: "Variable name contains 'encryptionkey' or 'encryption-key'",
    severity: Severity.High,
    namePattern: /encryption[_-]?key/i,
  },
  {
    name: "subscription-key-name",
    description:
      "Variable name contains 'subscriptionkey' or 'subscription-key' or 'subscription_key'",
    severity: Severity.Critical,
    namePattern: /subscription[_-]?key/i,
  },
  {
    name: "subscription-id-name",
    description:
      "Variable name contains 'subscriptionid' or 'subscription-id' or 'subscription_id'",
    severity: Severity.Medium,
    namePattern: /subscription[_-]?id/i,
  },
  {
    name: "kek-name",
    description: "Variable name contains 'KEK' (Key Encryption Key)",
    severity: Severity.Critical,
    namePattern: /(?:^|[^a-zA-Z])KEK(?:$|[^a-zA-Z])|key[_-]?encryption[_-]?key/i,
  },
  {
    name: "master-key-name",
    description: "Variable name contains 'masterkey' or 'master-key'",
    severity: Severity.Critical,
    namePattern: /master[_-]?key/i,
  },
  {
    name: "shared-key-name",
    description: "Variable name contains 'sharedkey' or 'shared-key'",
    severity: Severity.High,
    namePattern: /shared[_-]?key/i,
  },
  {
    name: "primary-key-name",
    description: "Variable name contains 'primarykey' or 'primary-key'",
    severity: Severity.High,
    namePattern: /primary[_-]?key/i,
  },
  {
    name: "secondary-key-name",
    description: "Variable name contains 'secondarykey' or 'secondary-key'",
    severity: Severity.High,
    namePattern: /secondary[_-]?key/i,
  },
  {
    name: "instrumentation-key-name",
    description: "Variable name contains 'instrumentationkey' or 'instrumentation-key'",
    severity: Severity.Medium,
    namePattern: /instrumentation[_-]?key/i,
  },
  {
    name: "app-secret-name",
    description:
      "Variable name contains 'appsecret' or 'app-secret' or 'clientsecret' or 'client-secret'",
    severity: Severity.Critical,
    namePattern: /(?:app|client)[_-]?secret/i,
  },
  {
    name: "tenant-id-name",
    description: "Variable name contains 'tenantid' or 'tenant-id'",
    severity: Severity.Medium,
    namePattern: /tenant[_-]?id/i,
  },
  {
    name: "client-id-name",
    description: "Variable name contains 'clientid' or 'client-id'",
    severity: Severity.Low,
    namePattern: /client[_-]?id/i,
  },
  {
    name: "account-key-name",
    description: "Variable name contains 'accountkey' or 'account-key'",
    severity: Severity.Critical,
    namePattern: /account[_-]?key/i,
  },
  {
    name: "storage-key-name",
    description: "Variable name contains 'storagekey' or 'storage-key'",
    severity: Severity.Critical,
    namePattern: /storage[_-]?key/i,
  },
  {
    name: "thumbprint-name",
    description: "Variable name contains 'thumbprint' or 'fingerprint'",
    severity: Severity.Medium,
    namePattern: /(?:thumbprint|fingerprint)/i,
  },
  {
    name: "certificate-name",
    description: "Variable name contains 'certificate' or 'cert'",
    severity: Severity.Medium,
    namePattern: /(?:certificate|cert)(?:$|[^a-z])/i,
  },
];

/**
 * Patterns that match on the **variable value** — the value itself looks like a
 * secret even if the name doesn't hint at it.
 */
export const VALUE_PATTERNS: SecretPattern[] = [
  {
    name: "connection-string-value",
    description: "Value looks like a SQL/database connection string with credentials",
    severity: Severity.Critical,
    valuePattern:
      /(?:Server|Data Source|Initial Catalog|User ID|Password|Integrated Security)\s*=/i,
  },
  {
    name: "azure-storage-key",
    description: "Value looks like an Azure Storage account key (base64, ~88 chars ending in ==)",
    severity: Severity.Critical,
    valuePattern: /^[A-Za-z0-9+/]{86,88}={1,2}$/,
  },
  {
    name: "sas-token",
    description: "Value looks like an Azure SAS token",
    severity: Severity.Critical,
    valuePattern: /(?:sv=\d{4}-\d{2}-\d{2}.*?&sig=|SharedAccessSignature\s+sr=)/,
  },
  {
    name: "jwt-token",
    description: "Value looks like a JWT token",
    severity: Severity.High,
    valuePattern: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  },
  {
    name: "private-key-block",
    description: "Value contains a PEM private key block",
    severity: Severity.Critical,
    valuePattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
  },
  {
    name: "basic-auth-url",
    description: "Value contains a URL with embedded credentials (user:pass@host)",
    severity: Severity.Critical,
    valuePattern: /https?:\/\/[^:]+:[^@]+@[^/]+/,
  },
  {
    name: "guid-secret-pattern",
    description:
      "Value looks like an Azure AD client secret (long alphanumeric with special chars)",
    severity: Severity.High,
    valuePattern: /^[A-Za-z0-9~._-]{30,}$/,
  },
  {
    name: "hex-key-value",
    description: "Value is a long hex string (40+ chars) that may be a key or thumbprint",
    severity: Severity.Medium,
    valuePattern: /^[0-9a-fA-F]{40,}$/,
  },
  {
    name: "bearer-token",
    description: "Value starts with 'Bearer ' followed by a token",
    severity: Severity.High,
    valuePattern: /^Bearer\s+[A-Za-z0-9._~+/=-]+$/,
  },
  {
    name: "aws-key-pattern",
    description: "Value looks like an AWS access key (starts with AKIA)",
    severity: Severity.Critical,
    valuePattern: /^AKIA[0-9A-Z]{16}$/,
  },
  {
    name: "github-token",
    description: "Value looks like a GitHub personal access token, OAuth, or app token",
    severity: Severity.Critical,
    valuePattern: /^(?:ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{36,255}$/,
  },
  {
    name: "azure-devops-pat",
    description: "Value looks like an Azure DevOps Personal Access Token (base32, 52+ chars)",
    severity: Severity.Critical,
    valuePattern: /^[a-z2-7]{52,256}$/,
  },
  {
    name: "npm-token",
    description: "Value looks like an npm access token",
    severity: Severity.Critical,
    valuePattern: /^npm_[A-Za-z0-9]{36,}$/,
  },
  {
    name: "slack-token",
    description: "Value looks like a Slack bot, user, or app token",
    severity: Severity.High,
    valuePattern: /^xox[bpras]-[0-9A-Za-z-]+$/,
  },
  {
    name: "slack-webhook",
    description: "Value looks like a Slack incoming webhook URL",
    severity: Severity.High,
    valuePattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
  },
  {
    name: "sendgrid-key",
    description: "Value looks like a SendGrid API key",
    severity: Severity.Critical,
    valuePattern: /^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/,
  },
  {
    name: "twilio-key",
    description: "Value looks like a Twilio API key or auth token",
    severity: Severity.Critical,
    valuePattern: /^SK[0-9a-fA-F]{32}$/,
  },
  // --- Enhancement #2: Additional secret patterns ---
  {
    name: "google-cloud-api-key",
    description: "Value looks like a Google Cloud API key (starts with AIza)",
    severity: Severity.Critical,
    valuePattern: /^AIza[0-9A-Za-z_-]{35}$/,
  },
  {
    name: "stripe-secret-key",
    description: "Value looks like a Stripe secret, publishable, or restricted key",
    severity: Severity.Critical,
    valuePattern: /^(?:sk_live|pk_live|rk_live)_[0-9a-zA-Z]{24,}$/,
  },
  {
    name: "hashicorp-vault-token",
    description: "Value looks like a HashiCorp Vault token (starts with hvs.)",
    severity: Severity.Critical,
    valuePattern: /^hvs\.[A-Za-z0-9_-]{24,}$/,
  },
  {
    name: "slack-bot-token",
    description: "Value looks like a Slack bot token (xoxb-)",
    severity: Severity.High,
    valuePattern: /^xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}$/,
  },
  {
    name: "slack-user-token",
    description: "Value looks like a Slack user token (xoxp-)",
    severity: Severity.High,
    valuePattern: /^xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{32}$/,
  },
  {
    name: "slack-session-token",
    description: "Value looks like a Slack session token (xoxs-)",
    severity: Severity.Critical,
    valuePattern: /^xoxs-[0-9A-Za-z._-]{40,}$/,
  },
  {
    name: "twilio-api-key",
    description: "Value looks like a Twilio API key (SK followed by 32 hex chars)",
    severity: Severity.Critical,
    valuePattern: /^SK[0-9a-f]{32}$/,
  },
  {
    name: "sendgrid-api-key",
    description: "Value looks like a SendGrid API key (starts with SG.)",
    severity: Severity.Critical,
    valuePattern: /^SG\.[A-Za-z0-9_-]{20,}/,
  },
];

export const SEVERITY_ORDER: Record<Severity, number> = {
  [Severity.Critical]: 0,
  [Severity.High]: 1,
  [Severity.Medium]: 2,
  [Severity.Low]: 3,
};

/** Pill tone for each severity (critical/high read as danger, medium as warning, low as info). */
export const SEVERITY_TONE: Record<Severity, "danger" | "warn" | "info"> = {
  [Severity.Critical]: "danger",
  [Severity.High]: "danger",
  [Severity.Medium]: "warn",
  [Severity.Low]: "info",
};

/** Pill tone for each confidence level. */
export const CONFIDENCE_TONE: Record<string, "success" | "warn" | "neutral"> = {
  high: "success",
  medium: "warn",
  low: "neutral",
};

// Persistence
export const SCANNER_SETTINGS_COLLECTION = "SecretScannerSettings";
export const CUSTOM_PATTERNS_DOC_ID = "custom-patterns";
export const IGNORE_LIST_DOC_ID = "ignore-list";
export const BUILTIN_OVERRIDES_DOC_ID = "builtin-pattern-overrides";
export const SCAN_HISTORY_DOC_ID = "scan-history";
export const PROJECT_SETTINGS_DOC_PREFIX = "project-settings-";
export const SETTINGS_VERSION = 1;

/** Maximum number of scan history entries to retain */
export const MAX_SCAN_HISTORY_ENTRIES = 10;

/** Number of items per page in paginated result views */
export const PAGE_SIZE = 100;

// --- Enhancement #1: GUID / false positive detection ---

/**
 * Standard GUID/UUID regex (8-4-4-4-12 hexadecimal digits).
 */
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Azure resource ID pattern — starts with /subscriptions/ followed by a GUID-like path.
 */
const AZURE_RESOURCE_ID_REGEX = /^\/subscriptions\/[0-9a-f-]+\//i;

/**
 * Well-known variable name patterns whose values are expected to be GUIDs
 * but aren't secrets (e.g. subscription IDs, tenant IDs, resource group names).
 */
const GUID_SAFE_NAME_PATTERNS = [
  /subscription[_-]?id/i,
  /tenant[_-]?id/i,
  /client[_-]?id/i,
  /resource[_-]?group/i,
  /object[_-]?id/i,
  /principal[_-]?id/i,
  /directory[_-]?id/i,
  /workspace[_-]?id/i,
  /app[_-]?id/i,
  /application[_-]?id/i,
  /project[_-]?id/i,
  /correlation[_-]?id/i,
];

/**
 * Checks whether a value-pattern match is likely a false positive.
 * Currently focuses on GUID-like strings that match the `guid-secret-pattern`
 * but are actually subscription IDs, tenant IDs, etc.
 *
 * @param value      The variable value that matched
 * @param varName    The variable name
 * @param patternName The built-in pattern that matched
 * @returns `true` if this looks like a false positive and should be suppressed
 */
export function isLikelyFalsePositive(
  value: string,
  varName: string,
  patternName: string
): boolean {
  // Only apply false-positive logic to certain patterns
  if (patternName === "guid-secret-pattern" || patternName === "hex-key-value") {
    // Pure GUID values are almost never secrets
    if (GUID_REGEX.test(value)) {
      return true;
    }

    // Azure resource IDs
    if (AZURE_RESOURCE_ID_REGEX.test(value)) {
      return true;
    }

    // GUID-safe variable names with GUID-like values
    if (GUID_SAFE_NAME_PATTERNS.some((p) => p.test(varName))) {
      return true;
    }

    // Short alphanumeric values that aren't high-entropy
    if (patternName === "guid-secret-pattern" && value.length < 34) {
      // Value is too short to be a real secret (typical client secrets are 34+ chars)
      return true;
    }
  }

  return false;
}

// --- Enhancement #10: Pipeline variable group detection ---

/**
 * Common variable group name patterns that suggest secret storage.
 */
export const SECRET_GROUP_NAME_PATTERNS = [
  /secret/i,
  /credential/i,
  /password/i,
  /key[_-]?vault/i,
  /private/i,
  /sensitive/i,
  /crypto/i,
  /auth/i,
  /token/i,
];

// --- Enhancement #12: Confidence scoring helpers ---

/**
 * Names near which a matched value is more likely to be a real secret.
 */
export const HIGH_CONFIDENCE_NAME_HINTS = [
  /password/i,
  /secret/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /api[_-]?key/i,
  /token/i,
  /connection[_-]?string/i,
  /credential/i,
];
