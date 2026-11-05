import * as React from "react";
import { Banner, Button } from "./ui";

interface NotificationBannersProps {
  scanError: string | null;
  onDismissScanError: () => void;
  pipelineRefWarning: string | null;
  onDismissPipelineWarning: () => void;
  settingsError: string | null;
  scanning: boolean;
  onRetrySettings: () => void;
  markAsSecretSuccess: string | null;
  onDismissSuccess: () => void;
  markAsSecretError: string | null;
  onDismissMarkError: () => void;
}

export const NotificationBanners: React.FC<NotificationBannersProps> = ({
  scanError,
  onDismissScanError,
  pipelineRefWarning,
  onDismissPipelineWarning,
  settingsError,
  scanning,
  onRetrySettings,
  markAsSecretSuccess,
  onDismissSuccess,
  markAsSecretError,
  onDismissMarkError,
}) => (
  <>
    {scanError && (
      <Banner tone="error" onDismiss={onDismissScanError}>
        {scanError}
      </Banner>
    )}

    {pipelineRefWarning && (
      <Banner tone="warn" onDismiss={onDismissPipelineWarning}>
        {pipelineRefWarning}
      </Banner>
    )}

    {settingsError && !scanning && (
      <Banner tone="error" title="Failed to load settings">
        <div className="ax-row">
          <span>{settingsError}</span>
          <Button size="sm" onClick={onRetrySettings}>
            Retry
          </Button>
        </div>
      </Banner>
    )}

    {markAsSecretSuccess && (
      <Banner tone="success" onDismiss={onDismissSuccess}>
        {markAsSecretSuccess}
      </Banner>
    )}

    {markAsSecretError && (
      <Banner tone="error" onDismiss={onDismissMarkError}>
        {markAsSecretError}
      </Banner>
    )}
  </>
);
