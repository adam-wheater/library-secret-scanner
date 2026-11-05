import * as React from "react";
import { CustomPatternDefinition, Severity, MatchSource } from "../models/interfaces";
import { SEVERITY_TONE } from "../utils/constants";
import { generateId } from "../utils/idUtils";
import { formatError } from "../utils/formatError";
import { Banner, Button, Card, EmptyState, Pill } from "./ui";

interface CustomPatternPanelProps {
  patterns: CustomPatternDefinition[];
  onAdd: (pattern: CustomPatternDefinition) => Promise<void>;
  onUpdate: (
    id: string,
    updates: Partial<Omit<CustomPatternDefinition, "id" | "createdAt">>
  ) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const initialForm = {
  name: "",
  description: "",
  severity: Severity.High as Severity,
  matchTarget: MatchSource.VariableName as MatchSource,
  regexSource: "",
  caseInsensitive: true,
  testInput: "",
};

export const CustomPatternPanel: React.FC<CustomPatternPanelProps> = ({
  patterns,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [regexError, setRegexError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const idPrefix = React.useId();

  const testMatch = React.useMemo(() => {
    if (!form.regexSource || !form.testInput) return null;
    try {
      const re = new RegExp(form.regexSource, form.caseInsensitive ? "i" : "");
      return re.test(form.testInput);
    } catch {
      return null;
    }
  }, [form.regexSource, form.testInput, form.caseInsensitive]);

  const validateRegex = React.useCallback((source: string, flags: string) => {
    if (!source) {
      setRegexError(null);
      return;
    }
    try {
      new RegExp(source, flags);
      setRegexError(null);
    } catch (e) {
      setRegexError(formatError(e));
    }
  }, []);

  const handleRegexChange = React.useCallback(
    (value: string) => {
      setForm((f) => ({ ...f, regexSource: value }));
      validateRegex(value, form.caseInsensitive ? "i" : "");
    },
    [form.caseInsensitive, validateRegex]
  );

  const handleSubmit = React.useCallback(async () => {
    if (!form.name.trim() || !form.regexSource.trim()) return;
    if (regexError) return;

    setSaving(true);
    setActionError(null);
    try {
      const pattern: CustomPatternDefinition = {
        id: generateId(),
        name: form.name.trim(),
        description: form.description.trim() || form.name.trim(),
        severity: form.severity,
        matchTarget: form.matchTarget,
        regexSource: form.regexSource,
        regexFlags: form.caseInsensitive ? "i" : "",
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      await onAdd(pattern);
      setForm(initialForm);
      setShowForm(false);
    } catch (e) {
      setActionError(formatError(e));
    } finally {
      setSaving(false);
    }
  }, [form, regexError, onAdd]);

  const handleToggle = React.useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await onUpdate(id, { enabled });
      } catch (e) {
        setActionError(formatError(e));
      }
    },
    [onUpdate]
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        await onRemove(id);
      } catch (e) {
        setActionError(formatError(e));
      }
    },
    [onRemove]
  );

  const canSubmit = !saving && !!form.name.trim() && !!form.regexSource.trim() && !regexError;

  return (
    <Card
      title="Custom Patterns"
      hint="Add your own regex patterns to detect secrets specific to your organisation."
      actions={
        <Button variant={showForm ? "default" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add Pattern"}
        </Button>
      }
    >
      {actionError && (
        <Banner tone="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Banner>
      )}

      {showForm && (
        <form
          className="ax-card ax-section"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="ax-card__body">
            <div className="ax-form-grid">
              <div className="ax-field">
                <label className="ax-label" htmlFor={`${idPrefix}-name`}>
                  Name *
                </label>
                <input
                  id={`${idPrefix}-name`}
                  type="text"
                  className="ax-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. slack-webhook"
                />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor={`${idPrefix}-description`}>
                  Description
                </label>
                <input
                  id={`${idPrefix}-description`}
                  type="text"
                  className="ax-input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Slack webhook URL pattern"
                />
              </div>
            </div>
            <div className="ax-form-grid">
              <div className="ax-field">
                <label className="ax-label" htmlFor={`${idPrefix}-severity`}>
                  Severity
                </label>
                <select
                  id={`${idPrefix}-severity`}
                  className="ax-select"
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}
                >
                  <option value={Severity.Critical}>Critical</option>
                  <option value={Severity.High}>High</option>
                  <option value={Severity.Medium}>Medium</option>
                  <option value={Severity.Low}>Low</option>
                </select>
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor={`${idPrefix}-target`}>
                  Match Target
                </label>
                <select
                  id={`${idPrefix}-target`}
                  className="ax-select"
                  value={form.matchTarget}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, matchTarget: e.target.value as MatchSource }))
                  }
                >
                  <option value={MatchSource.VariableName}>Variable Name</option>
                  <option value={MatchSource.VariableValue}>Variable Value</option>
                </select>
              </div>
              <div className="ax-field" style={{ justifyContent: "flex-end" }}>
                <label className="ax-check">
                  <input
                    type="checkbox"
                    checked={form.caseInsensitive}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, caseInsensitive: e.target.checked }));
                      validateRegex(form.regexSource, e.target.checked ? "i" : "");
                    }}
                  />
                  Case insensitive
                </label>
              </div>
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor={`${idPrefix}-regex`}>
                Regex Pattern *
              </label>
              <input
                id={`${idPrefix}-regex`}
                type="text"
                className={`ax-input ax-mono${regexError ? " ax-input--invalid" : ""}`}
                value={form.regexSource}
                onChange={(e) => handleRegexChange(e.target.value)}
                placeholder="e.g. hooks\\.slack\\.com"
                aria-invalid={!!regexError}
                aria-describedby={regexError ? `${idPrefix}-regex-error` : undefined}
              />
              {regexError && (
                <span id={`${idPrefix}-regex-error`} className="ax-help" role="alert">
                  {regexError}
                </span>
              )}
            </div>

            <div className="ax-field">
              <label className="ax-label" htmlFor={`${idPrefix}-test`}>
                Test (enter a sample{" "}
                {form.matchTarget === MatchSource.VariableName ? "variable name" : "variable value"}
                )
              </label>
              <div className="ax-row" style={{ flexWrap: "nowrap" }}>
                <input
                  id={`${idPrefix}-test`}
                  type="text"
                  className="ax-input ax-mono"
                  style={{ flex: 1 }}
                  value={form.testInput}
                  onChange={(e) => setForm((f) => ({ ...f, testInput: e.target.value }))}
                  placeholder={
                    form.matchTarget === MatchSource.VariableName
                      ? "e.g. SlackWebhookUrl"
                      : "e.g. https://hooks.slack.com/..."
                  }
                />
                {form.testInput && testMatch !== null && (
                  <Pill tone={testMatch ? "success" : "neutral"}>
                    {testMatch ? "Match" : "No match"}
                  </Pill>
                )}
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={!canSubmit} busy={saving}>
              {saving ? "Saving..." : "Save Pattern"}
            </Button>
          </div>
        </form>
      )}

      {patterns.length === 0 ? (
        <EmptyState title='No custom patterns defined yet. Click "Add Pattern" to create one.' />
      ) : (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Name</th>
                <th>Target</th>
                <th>Regex</th>
                <th>Severity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="ax-check"
                      checked={p.enabled}
                      onChange={(e) => handleToggle(p.id, e.target.checked)}
                      aria-label={`Enable ${p.name}`}
                    />
                  </td>
                  <td>
                    <div className="ax-row" style={{ flexWrap: "nowrap" }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {!p.enabled && <Pill tone="neutral">Off</Pill>}
                    </div>
                    <div className="ax-help">{p.description}</div>
                  </td>
                  <td>{p.matchTarget === MatchSource.VariableName ? "Name" : "Value"}</td>
                  <td className="ax-mono">
                    /{p.regexSource}/{p.regexFlags}
                  </td>
                  <td>
                    <Pill tone={SEVERITY_TONE[p.severity]}>{p.severity}</Pill>
                  </td>
                  <td>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
