import {
  matchVariable,
  scanVariables,
  matchVariableWithPatterns,
  compileCustomPatterns,
  filterIgnoredFindings,
  makeIgnoreKey,
  scanVariablesWithCustomPatterns,
  isIgnoreEntryActive,
  calculateEntropy,
  computeConfidence,
  VariableEntry,
} from "../../src/scanning/SecretPatternMatcher";
import { isLikelyFalsePositive } from "../../src/utils/constants";
import {
  Severity,
  Confidence,
  MatchSource,
  CustomPatternDefinition,
  IgnoreEntry,
  SecretFinding,
} from "../../src/models/interfaces";
import { SecretPattern } from "../../src/utils/constants";

function makeVar(
  name: string,
  value: string = "some-value",
  isSecret: boolean = false
): VariableEntry {
  return { name, value, isSecret };
}

describe("SecretPatternMatcher", () => {
  describe("matchVariable — name patterns", () => {
    test("flags variable named 'DatabasePassword'", () => {
      const findings = matchVariable(makeVar("DatabasePassword", "P@ssw0rd"), 1, "TestGroup");
      expect(findings.length).toBeGreaterThan(0);
      const nameMatch = findings.find((f) => f.matchSource === MatchSource.VariableName);
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
      expect(nameMatch!.patternName).toBe("password-name");
    });

    test("flags variable named 'ApiKey'", () => {
      const findings = matchVariable(makeVar("ApiKey", "abc123"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "api-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'api-key'", () => {
      const findings = matchVariable(makeVar("api-key", "abc123"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "api-key-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'api_key'", () => {
      const findings = matchVariable(makeVar("api_key", "abc123"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "api-key-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'AuthToken'", () => {
      const findings = matchVariable(makeVar("AuthToken", "xyz"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "token-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'ClientSecret'", () => {
      const findings = matchVariable(makeVar("ClientSecret", "sec"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "secret-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'SqlConnectionString'", () => {
      const findings = matchVariable(makeVar("SqlConnectionString", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "connection-string-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'connection-string'", () => {
      const findings = matchVariable(makeVar("connection-string", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "connection-string-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'PrivateKey'", () => {
      const findings = matchVariable(makeVar("PrivateKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "private-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'StorageAccessKey'", () => {
      const findings = matchVariable(makeVar("StorageAccessKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "access-key-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'SigningKey'", () => {
      const findings = matchVariable(makeVar("SigningKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "signing-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'CertThumbprint'", () => {
      const findings = matchVariable(makeVar("CertThumbprint", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "thumbprint-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Medium);
    });

    test("flags variable named 'SslCertificate'", () => {
      const findings = matchVariable(makeVar("SslCertificate", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "certificate-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'SvcCredential'", () => {
      const findings = matchVariable(makeVar("SvcCredential", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "credential-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'ApimSubscriptionKey'", () => {
      const findings = matchVariable(makeVar("ApimSubscriptionKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "subscription-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'subscription-key'", () => {
      const findings = matchVariable(makeVar("subscription-key", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "subscription-key-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'subscription_key'", () => {
      const findings = matchVariable(makeVar("subscription_key", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "subscription-key-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'SubscriptionId'", () => {
      const findings = matchVariable(makeVar("SubscriptionId", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "subscription-id-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Medium);
    });

    test("flags variable named 'KEK' (Key Encryption Key)", () => {
      const findings = matchVariable(makeVar("KEK", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "kek-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'Blob-KEK-Value'", () => {
      const findings = matchVariable(makeVar("Blob-KEK-Value", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "kek-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'KeyEncryptionKey'", () => {
      const findings = matchVariable(makeVar("KeyEncryptionKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "kek-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'MasterKey'", () => {
      const findings = matchVariable(makeVar("MasterKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "master-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'SharedKey'", () => {
      const findings = matchVariable(makeVar("SharedKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "shared-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'PrimaryKey'", () => {
      const findings = matchVariable(makeVar("PrimaryKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "primary-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'SecondaryKey'", () => {
      const findings = matchVariable(makeVar("SecondaryKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "secondary-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.High);
    });

    test("flags variable named 'InstrumentationKey'", () => {
      const findings = matchVariable(makeVar("InstrumentationKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "instrumentation-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Medium);
    });

    test("flags variable named 'ClientSecret'", () => {
      const findings = matchVariable(makeVar("ClientSecret", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "app-secret-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'AppSecret'", () => {
      const findings = matchVariable(makeVar("AppSecret", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "app-secret-name");
      expect(nameMatch).toBeDefined();
    });

    test("flags variable named 'TenantId'", () => {
      const findings = matchVariable(makeVar("TenantId", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "tenant-id-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Medium);
    });

    test("flags variable named 'ClientId'", () => {
      const findings = matchVariable(makeVar("ClientId", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "client-id-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Low);
    });

    test("flags variable named 'StorageAccountKey'", () => {
      const findings = matchVariable(makeVar("StorageAccountKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "account-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("flags variable named 'StorageKey'", () => {
      const findings = matchVariable(makeVar("StorageKey", "val"), 1, "TestGroup");
      const nameMatch = findings.find((f) => f.patternName === "storage-key-name");
      expect(nameMatch).toBeDefined();
      expect(nameMatch!.severity).toBe(Severity.Critical);
    });

    test("does NOT flag benign names like 'Environment'", () => {
      const findings = matchVariable(makeVar("Environment", "production"), 1, "TestGroup");
      const nameMatch = findings.filter((f) => f.matchSource === MatchSource.VariableName);
      expect(nameMatch).toHaveLength(0);
    });

    test("does NOT flag 'AppServiceName'", () => {
      const findings = matchVariable(makeVar("AppServiceName", "my-app"), 1, "TestGroup");
      const nameMatch = findings.filter((f) => f.matchSource === MatchSource.VariableName);
      expect(nameMatch).toHaveLength(0);
    });

    test("does NOT flag 'BuildConfiguration'", () => {
      const findings = matchVariable(makeVar("BuildConfiguration", "Release"), 1, "TestGroup");
      const nameMatch = findings.filter((f) => f.matchSource === MatchSource.VariableName);
      expect(nameMatch).toHaveLength(0);
    });
  });

  describe("matchVariable — value patterns", () => {
    test("flags SQL connection string value", () => {
      const connStr =
        "Server=myserver.database.windows.net;Initial Catalog=mydb;User ID=admin;Password=s3cret!";
      const findings = matchVariable(makeVar("DbConn", connStr), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "connection-string-value");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Critical);
      expect(valueMatch!.matchSource).toBe(MatchSource.VariableValue);
    });

    test("flags Azure Storage account key", () => {
      // 88-char base64 string ending in ==
      const storageKey =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/abcdefghijklmnopqrstuv==";
      const findings = matchVariable(makeVar("StorageConn", storageKey), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "azure-storage-key");
      expect(valueMatch).toBeDefined();
    });

    test("flags SAS token value", () => {
      const sas = "sv=2021-06-08&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2024-01-01&sig=abc123";
      const findings = matchVariable(makeVar("BlobSas", sas), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "sas-token");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Critical);
    });

    test("flags JWT token value", () => {
      const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123_signature-test";
      const findings = matchVariable(makeVar("JwtValue", jwt), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "jwt-token");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.High);
    });

    test("flags PEM private key value", () => {
      const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIBogI...";
      const findings = matchVariable(makeVar("KeyData", pem), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "private-key-block");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Critical);
    });

    test("flags URL with embedded credentials", () => {
      const url = "https://admin:s3cret@myservice.example.com/api";
      const findings = matchVariable(makeVar("ServiceUrl", url), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "basic-auth-url");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Critical);
    });

    test("flags long hex string", () => {
      const hex = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4";
      const findings = matchVariable(makeVar("SomeHash", hex), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "hex-key-value");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Medium);
    });

    test("flags Bearer token value", () => {
      const bearer = "Bearer eyJhbGciOiJSUzI1NiJ9.payload.signature";
      const findings = matchVariable(makeVar("AuthHeader", bearer), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "bearer-token");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.High);
    });

    test("flags AWS access key", () => {
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      const findings = matchVariable(makeVar("AwsKey", awsKey), 1, "TestGroup");
      const valueMatch = findings.find((f) => f.patternName === "aws-key-pattern");
      expect(valueMatch).toBeDefined();
      expect(valueMatch!.severity).toBe(Severity.Critical);
    });

    test("does NOT flag short simple values", () => {
      const findings = matchVariable(makeVar("Region", "westeurope"), 1, "TestGroup");
      const valueMatch = findings.filter((f) => f.matchSource === MatchSource.VariableValue);
      expect(valueMatch).toHaveLength(0);
    });

    test("does NOT flag boolean values", () => {
      const findings = matchVariable(makeVar("EnableFeature", "true"), 1, "TestGroup");
      const valueMatch = findings.filter((f) => f.matchSource === MatchSource.VariableValue);
      expect(valueMatch).toHaveLength(0);
    });

    test("does NOT flag numeric values", () => {
      const findings = matchVariable(makeVar("MaxRetries", "3"), 1, "TestGroup");
      const valueMatch = findings.filter((f) => f.matchSource === MatchSource.VariableValue);
      expect(valueMatch).toHaveLength(0);
    });
  });

  describe("matchVariable — already secret", () => {
    test("skips variables already marked as secret", () => {
      const findings = matchVariable(
        makeVar("DatabasePassword", "supersecret", true),
        1,
        "TestGroup"
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("matchVariable — empty value", () => {
    test("checks name patterns but skips value patterns for empty values", () => {
      const findings = matchVariable(makeVar("ApiKey", ""), 1, "TestGroup");
      const nameMatch = findings.filter((f) => f.matchSource === MatchSource.VariableName);
      const valueMatch = findings.filter((f) => f.matchSource === MatchSource.VariableValue);
      expect(nameMatch.length).toBeGreaterThan(0);
      expect(valueMatch).toHaveLength(0);
    });
  });

  describe("matchVariable — finding metadata", () => {
    test("populates all finding fields correctly", () => {
      const findings = matchVariable(
        makeVar("DatabasePassword", "s3cret!"),
        42,
        "Production Variables"
      );
      const finding = findings.find((f) => f.patternName === "password-name")!;

      expect(finding.variableGroupId).toBe(42);
      expect(finding.variableGroupName).toBe("Production Variables");
      expect(finding.variableName).toBe("DatabasePassword");
      expect(finding.variableValue).toBe("s3cret!");
      expect(finding.isAlreadySecret).toBe(false);
      expect(finding.matchSource).toBe(MatchSource.VariableName);
    });
  });

  describe("scanVariables", () => {
    test("scans multiple variables and returns sorted findings", () => {
      const variables: VariableEntry[] = [
        makeVar("Environment", "production"),
        makeVar("DatabasePassword", "secret123"),
        makeVar("ApiToken", "tok-abc"),
        makeVar("Region", "westeurope"),
      ];

      const findings = scanVariables(variables, 1, "TestGroup");

      expect(findings.length).toBeGreaterThanOrEqual(2);
      // Critical findings should come before High
      const severities = findings.map((f) => f.severity);
      const critIdx = severities.indexOf(Severity.Critical);
      const highIdx = severities.indexOf(Severity.High);
      if (critIdx >= 0 && highIdx >= 0) {
        expect(critIdx).toBeLessThan(highIdx);
      }
    });

    test("de-duplicates findings for the same variable and pattern", () => {
      const variables: VariableEntry[] = [makeVar("DatabasePassword", "s3cret!")];
      const findings = scanVariables(variables, 1, "TestGroup");
      // Should only have one "password-name" match for this variable
      const passwordFindings = findings.filter((f) => f.patternName === "password-name");
      expect(passwordFindings).toHaveLength(1);
    });

    test("returns empty array for clean variables", () => {
      const variables: VariableEntry[] = [
        makeVar("Environment", "staging"),
        makeVar("Region", "eastus"),
        makeVar("MaxRetries", "3"),
      ];
      const findings = scanVariables(variables, 1, "TestGroup");
      expect(findings).toHaveLength(0);
    });

    test("skips all secret variables", () => {
      const variables: VariableEntry[] = [
        makeVar("Password", "secret", true),
        makeVar("ApiKey", "key123", true),
      ];
      const findings = scanVariables(variables, 1, "TestGroup");
      expect(findings).toHaveLength(0);
    });

    test("handles empty variable list", () => {
      const findings = scanVariables([], 1, "TestGroup");
      expect(findings).toHaveLength(0);
    });
  });

  describe("matchVariableWithPatterns — custom patterns", () => {
    test("matches custom name patterns", () => {
      const customNamePatterns: SecretPattern[] = [
        {
          name: "custom-secret",
          description: "Custom secret pattern",
          severity: Severity.High,
          namePattern: /^custom_/i,
        },
      ];

      const findings = matchVariableWithPatterns(
        makeVar("custom_value", "test"),
        1,
        "TestGroup",
        customNamePatterns,
        []
      );

      expect(findings).toHaveLength(1);
      expect(findings[0].patternName).toBe("custom-secret");
    });

    test("matches custom value patterns", () => {
      const customValuePatterns: SecretPattern[] = [
        {
          name: "custom-value",
          description: "Custom value pattern",
          severity: Severity.Medium,
          valuePattern: /^xoxb-/,
        },
      ];

      const findings = matchVariableWithPatterns(
        makeVar("SlackToken", "xoxb-123-456-abc"),
        1,
        "TestGroup",
        [],
        customValuePatterns
      );

      expect(findings).toHaveLength(1);
      expect(findings[0].patternName).toBe("custom-value");
    });

    test("skips secret variables even with custom patterns", () => {
      const customPatterns: SecretPattern[] = [
        {
          name: "custom",
          description: "Custom",
          severity: Severity.High,
          namePattern: /./,
        },
      ];

      const findings = matchVariableWithPatterns(
        makeVar("anything", "value", true),
        1,
        "TestGroup",
        customPatterns,
        []
      );

      expect(findings).toHaveLength(0);
    });
  });

  describe("makeIgnoreKey", () => {
    test("returns composite key with :: separator", () => {
      expect(makeIgnoreKey(42, "MyPassword", "password")).toBe("42::MyPassword::password");
    });

    test("handles special characters in names", () => {
      expect(makeIgnoreKey(1, "My::Var", "pattern::name")).toBe("1::My::Var::pattern::name");
    });
  });

  describe("filterIgnoredFindings", () => {
    const baseFinding: SecretFinding = {
      variableGroupId: 1,
      variableGroupName: "Group1",
      variableName: "DbPassword",
      variableValue: "secret123",
      isAlreadySecret: false,
      severity: Severity.Critical,
      matchSource: MatchSource.VariableName,
      patternName: "password",
      description: "Password pattern",
      confidence: Confidence.High,
    };

    test("returns all findings when ignore list is empty", () => {
      const findings = [baseFinding];
      expect(filterIgnoredFindings(findings, [])).toEqual(findings);
    });

    test("filters out matching ignored entries", () => {
      const ignore: IgnoreEntry = {
        id: "ign-1",
        variableGroupId: 1,
        variableGroupName: "Group1",
        variableName: "DbPassword",
        patternName: "password",
        reason: "false positive",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
      };
      expect(filterIgnoredFindings([baseFinding], [ignore])).toHaveLength(0);
    });

    test("does not filter findings with different pattern names", () => {
      const ignore: IgnoreEntry = {
        id: "ign-1",
        variableGroupId: 1,
        variableGroupName: "Group1",
        variableName: "DbPassword",
        patternName: "different-pattern",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
      };
      expect(filterIgnoredFindings([baseFinding], [ignore])).toHaveLength(1);
    });

    test("does not filter findings with different group id", () => {
      const ignore: IgnoreEntry = {
        id: "ign-1",
        variableGroupId: 999,
        variableGroupName: "OtherGroup",
        variableName: "DbPassword",
        patternName: "password",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
      };
      expect(filterIgnoredFindings([baseFinding], [ignore])).toHaveLength(1);
    });

    test("does not mutate the original array", () => {
      const findings = [baseFinding];
      const ignore: IgnoreEntry = {
        id: "ign-1",
        variableGroupId: 1,
        variableGroupName: "Group1",
        variableName: "DbPassword",
        patternName: "password",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
      };
      filterIgnoredFindings(findings, [ignore]);
      expect(findings).toHaveLength(1);
    });
  });

  describe("compileCustomPatterns", () => {
    test("compiles a name-targeted pattern", () => {
      const defs: CustomPatternDefinition[] = [
        {
          id: "cp-1",
          name: "slack-webhook",
          description: "Slack webhook URLs",
          severity: Severity.High,
          matchTarget: MatchSource.VariableName,
          regexSource: "slack.*webhook",
          regexFlags: "i",
          enabled: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = compileCustomPatterns(defs);
      expect(result.namePatterns).toHaveLength(1);
      expect(result.valuePatterns).toHaveLength(0);
      expect(result.namePatterns[0].namePattern!.test("SlackWebhookUrl")).toBe(true);
    });

    test("compiles a value-targeted pattern", () => {
      const defs: CustomPatternDefinition[] = [
        {
          id: "cp-2",
          name: "internal-url",
          description: "Internal URLs",
          severity: Severity.Medium,
          matchTarget: MatchSource.VariableValue,
          regexSource: "https://internal\\.",
          regexFlags: "i",
          enabled: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = compileCustomPatterns(defs);
      expect(result.namePatterns).toHaveLength(0);
      expect(result.valuePatterns).toHaveLength(1);
      expect(result.valuePatterns[0].valuePattern!.test("https://internal.corp.com")).toBe(true);
    });

    test("skips disabled patterns", () => {
      const defs: CustomPatternDefinition[] = [
        {
          id: "cp-3",
          name: "disabled-one",
          description: "disabled",
          severity: Severity.Low,
          matchTarget: MatchSource.VariableName,
          regexSource: "something",
          regexFlags: "",
          enabled: false,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = compileCustomPatterns(defs);
      expect(result.namePatterns).toHaveLength(0);
      expect(result.valuePatterns).toHaveLength(0);
    });

    test("skips patterns with invalid regex", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const defs: CustomPatternDefinition[] = [
        {
          id: "cp-4",
          name: "bad-regex",
          description: "broken",
          severity: Severity.High,
          matchTarget: MatchSource.VariableName,
          regexSource: "[invalid",
          regexFlags: "",
          enabled: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = compileCustomPatterns(defs);
      expect(result.namePatterns).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test("preserves severity from definition", () => {
      const defs: CustomPatternDefinition[] = [
        {
          id: "cp-5",
          name: "crit-pattern",
          description: "critical",
          severity: Severity.Critical,
          matchTarget: MatchSource.VariableName,
          regexSource: "test",
          regexFlags: "",
          enabled: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = compileCustomPatterns(defs);
      expect(result.namePatterns[0].severity).toBe(Severity.Critical);
    });
  });

  describe("scanVariablesWithCustomPatterns", () => {
    test("combines built-in and custom pattern matches", () => {
      const vars: VariableEntry[] = [
        makeVar("DbPassword", "myvalue"),
        makeVar("SlackHook", "https://hooks.slack.com/xxx"),
      ];

      const customName: SecretPattern[] = [
        {
          name: "slack-hook",
          description: "Slack hook",
          severity: Severity.Medium,
          namePattern: /slack/i,
        },
      ];

      const findings = scanVariablesWithCustomPatterns(vars, 1, "TestGroup", customName, []);
      const names = findings.map((f) => f.variableName);
      expect(names).toContain("DbPassword");
      expect(names).toContain("SlackHook");
    });

    test("deduplicates findings with same pattern name across built-in and custom", () => {
      const vars: VariableEntry[] = [makeVar("ApiPassword", "value")];

      // Custom pattern with SAME name as the built-in (password-name)
      const customName: SecretPattern[] = [
        {
          name: "password-name",
          description: "duplicate password",
          severity: Severity.Low,
          namePattern: /password/i,
        },
      ];

      const findings = scanVariablesWithCustomPatterns(vars, 1, "G", customName, []);
      // Should deduplicate: same variable + pattern name, keep higher severity
      const passwordFindings = findings.filter(
        (f) => f.variableName === "ApiPassword" && f.patternName === "password-name"
      );
      expect(passwordFindings).toHaveLength(1);
      // The built-in password-name pattern is Critical, custom is Low — should keep Critical
      expect(passwordFindings[0].severity).toBe(Severity.Critical);
    });

    test("returns sorted by severity then name", () => {
      const vars: VariableEntry[] = [makeVar("ZToken", "value"), makeVar("AKey", "value")];

      const customName: SecretPattern[] = [
        {
          name: "z-token",
          description: "token",
          severity: Severity.Low,
          namePattern: /ztoken/i,
        },
        {
          name: "a-key",
          description: "key",
          severity: Severity.Critical,
          namePattern: /akey/i,
        },
      ];

      const findings = scanVariablesWithCustomPatterns(vars, 1, "G", customName, []);
      if (findings.length >= 2) {
        // Critical should come before Low
        const critIdx = findings.findIndex((f) => f.patternName === "a-key");
        const lowIdx = findings.findIndex((f) => f.patternName === "z-token");
        if (critIdx !== -1 && lowIdx !== -1) {
          expect(critIdx).toBeLessThan(lowIdx);
        }
      }
    });

    test("skips variables already marked as secret", () => {
      const vars: VariableEntry[] = [makeVar("SecretVar", "hidden", true)];
      const customName: SecretPattern[] = [
        {
          name: "catch-all",
          description: "matches everything",
          severity: Severity.High,
          namePattern: /./,
        },
      ];

      const findings = scanVariablesWithCustomPatterns(vars, 1, "G", customName, []);
      expect(findings).toHaveLength(0);
    });
  });

  // --- Enhancement #1: False positive detection ---

  describe("isLikelyFalsePositive", () => {
    test("detects standard GUID as false positive for guid-secret-pattern", () => {
      expect(
        isLikelyFalsePositive(
          "550e8400-e29b-41d4-a716-446655440000",
          "SomeVar",
          "guid-secret-pattern"
        )
      ).toBe(true);
    });

    test("detects Azure resource ID as false positive", () => {
      expect(
        isLikelyFalsePositive(
          "/subscriptions/550e8400-e29b-41d4-a716-446655440000/resourceGroups/rg1",
          "ResourceId",
          "guid-secret-pattern"
        )
      ).toBe(true);
    });

    test("detects subscription-id variable names as false positive", () => {
      expect(
        isLikelyFalsePositive(
          "550e8400e29b41d4a716446655440000aabbccdd",
          "subscription_id",
          "hex-key-value"
        )
      ).toBe(true);
    });

    test("detects short values as false positive for guid-secret-pattern", () => {
      expect(isLikelyFalsePositive("short-value-here", "SomeVar", "guid-secret-pattern")).toBe(
        true
      );
    });

    test("does not flag long alphanumeric values as false positive", () => {
      expect(
        isLikelyFalsePositive(
          "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
          "SomeApiSecret",
          "guid-secret-pattern"
        )
      ).toBe(false);
    });

    test("returns false for non-GUID patterns", () => {
      expect(isLikelyFalsePositive("any-value", "AnyVar", "connection-string-value")).toBe(false);
    });
  });

  // --- Enhancement #2: Additional secret patterns ---

  describe("Additional secret pattern detection", () => {
    test("flags Google Cloud API key", () => {
      const findings = matchVariable(
        makeVar("GcpKey", "AIzaSyA1234567890abcdefghijklmnopqrstuv"),
        1,
        "G"
      );
      const match = findings.find((f) => f.patternName === "google-cloud-api-key");
      expect(match).toBeDefined();
      expect(match!.severity).toBe(Severity.Critical);
    });

    test("flags Stripe secret key", () => {
      const findings = matchVariable(
        makeVar("StripeKey", "sk_live_abcdefghijklmnopqrstuvwx"),
        1,
        "G"
      );
      const match = findings.find((f) => f.patternName === "stripe-secret-key");
      expect(match).toBeDefined();
      expect(match!.severity).toBe(Severity.Critical);
    });

    test("flags Stripe publishable key", () => {
      const findings = matchVariable(
        makeVar("StripePk", "pk_live_abcdefghijklmnopqrstuvwx"),
        1,
        "G"
      );
      const match = findings.find((f) => f.patternName === "stripe-secret-key");
      expect(match).toBeDefined();
    });

    test("flags Stripe restricted key", () => {
      const findings = matchVariable(
        makeVar("StripeRk", "rk_live_abcdefghijklmnopqrstuvwx"),
        1,
        "G"
      );
      const match = findings.find((f) => f.patternName === "stripe-secret-key");
      expect(match).toBeDefined();
    });

    test("flags HashiCorp Vault token", () => {
      const findings = matchVariable(makeVar("VaultToken", "hvs.ABCDEFGHIJKLMNOPQRSTUVWX"), 1, "G");
      const match = findings.find((f) => f.patternName === "hashicorp-vault-token");
      expect(match).toBeDefined();
      expect(match!.severity).toBe(Severity.Critical);
    });

    test("flags Slack bot token (xoxb-)", () => {
      const findings = matchVariable(
        makeVar("SlackBotToken", "xoxb-1234567890-1234567890-abcdefghijklmnopqrstuvwx"),
        1,
        "G"
      );
      const slackMatches = findings.filter(
        (f) => f.patternName === "slack-bot-token" || f.patternName === "slack-token"
      );
      expect(slackMatches.length).toBeGreaterThan(0);
    });

    test("flags SendGrid API key (SG.)", () => {
      const findings = matchVariable(
        makeVar("SgKey", "SG.abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz0123456789_abcde"),
        1,
        "G"
      );
      const sgMatches = findings.filter(
        (f) => f.patternName === "sendgrid-key" || f.patternName === "sendgrid-api-key"
      );
      expect(sgMatches.length).toBeGreaterThan(0);
    });

    test("flags Twilio API key (SK + 32 hex chars)", () => {
      const findings = matchVariable(
        makeVar("TwilioKey", "SK0123456789abcdef0123456789abcdef"),
        1,
        "G"
      );
      const twilioMatches = findings.filter(
        (f) => f.patternName === "twilio-key" || f.patternName === "twilio-api-key"
      );
      expect(twilioMatches.length).toBeGreaterThan(0);
    });
  });

  // --- Enhancement #3: Expiry-aware ignore entries ---

  describe("isIgnoreEntryActive", () => {
    test("returns true when no expiresAt is set", () => {
      const entry: IgnoreEntry = {
        id: "e1",
        variableGroupId: 1,
        variableGroupName: "G",
        variableName: "V",
        patternName: "P",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
      };
      expect(isIgnoreEntryActive(entry)).toBe(true);
    });

    test("returns true when expiresAt is in the future", () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const entry: IgnoreEntry = {
        id: "e2",
        variableGroupId: 1,
        variableGroupName: "G",
        variableName: "V",
        patternName: "P",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
        expiresAt: future,
      };
      expect(isIgnoreEntryActive(entry)).toBe(true);
    });

    test("returns false when expiresAt is in the past", () => {
      const entry: IgnoreEntry = {
        id: "e3",
        variableGroupId: 1,
        variableGroupName: "G",
        variableName: "V",
        patternName: "P",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
        expiresAt: "2020-01-01T00:00:00Z",
      };
      expect(isIgnoreEntryActive(entry)).toBe(false);
    });
  });

  describe("filterIgnoredFindings with expiry", () => {
    const baseFindingForExpiry: SecretFinding = {
      variableGroupId: 1,
      variableGroupName: "Group1",
      variableName: "DbPassword",
      variableValue: "secret123",
      isAlreadySecret: false,
      severity: Severity.Critical,
      matchSource: MatchSource.VariableName,
      patternName: "password",
      description: "Password pattern",
      confidence: Confidence.High,
    };

    test("does not filter findings when ignore entry has expired", () => {
      const expired: IgnoreEntry = {
        id: "ign-exp",
        variableGroupId: 1,
        variableGroupName: "Group1",
        variableName: "DbPassword",
        patternName: "password",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
        expiresAt: "2020-01-01T00:00:00Z",
      };
      const result = filterIgnoredFindings([baseFindingForExpiry], [expired]);
      expect(result).toHaveLength(1);
    });

    test("filters findings when ignore entry has not expired", () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const active: IgnoreEntry = {
        id: "ign-active",
        variableGroupId: 1,
        variableGroupName: "Group1",
        variableName: "DbPassword",
        patternName: "password",
        reason: "",
        ignoredAt: "2024-01-01T00:00:00Z",
        ignoredBy: "user",
        expiresAt: future,
      };
      const result = filterIgnoredFindings([baseFindingForExpiry], [active]);
      expect(result).toHaveLength(0);
    });
  });

  // --- Enhancement #12: Confidence scoring ---

  describe("calculateEntropy", () => {
    test("returns 0 for empty string", () => {
      expect(calculateEntropy("")).toBe(0);
    });

    test("returns 0 for single character repeated", () => {
      expect(calculateEntropy("aaaa")).toBe(0);
    });

    test("returns higher entropy for random-looking strings", () => {
      const lowEntropy = calculateEntropy("aaabbb");
      const highEntropy = calculateEntropy("a1b2c3d4e5f6");
      expect(highEntropy).toBeGreaterThan(lowEntropy);
    });

    test("returns a reasonable value for a typical secret", () => {
      const entropy = calculateEntropy("K8s!Pr0d#SecR3t_v2.key");
      expect(entropy).toBeGreaterThan(3.0);
    });
  });

  describe("computeConfidence", () => {
    test("returns High for high-specificity patterns", () => {
      expect(
        computeConfidence("Any", "value", MatchSource.VariableValue, "connection-string-value")
      ).toBe(Confidence.High);
    });

    test("returns High for high-specificity Stripe pattern", () => {
      expect(
        computeConfidence("Key", "value", MatchSource.VariableValue, "stripe-secret-key")
      ).toBe(Confidence.High);
    });

    test("returns High for strong name hints on name-based matches", () => {
      expect(
        computeConfidence("DatabasePassword", "", MatchSource.VariableName, "password-name")
      ).toBe(Confidence.High);
    });

    test("returns Medium for weak name hints on name-based matches", () => {
      expect(
        computeConfidence("SomeEncryption", "", MatchSource.VariableName, "encryption-key-name")
      ).toBe(Confidence.Medium);
    });

    test("returns Low for low-entropy value with no name hint", () => {
      expect(
        computeConfidence("SomeVar", "aaaa", MatchSource.VariableValue, "generic-pattern")
      ).toBe(Confidence.Low);
    });
  });
});
