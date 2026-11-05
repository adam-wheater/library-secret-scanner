import * as React from "react";
import { Button, Modal } from "./ui";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
  onConfirm: (inputValue?: string, expiresAt?: string) => void;
  onCancel: () => void;
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  /** When true, show an optional expiry date picker for ignore entries. */
  showExpiryDate?: boolean;
}

/** Today's date as YYYY-MM-DD in the user's local calendar (for the picker's min). */
function todayLocalIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Converts a YYYY-MM-DD picker value into the ISO instant at the END of that
 * local day. Parsing the bare string with `new Date()` would give midnight UTC,
 * which (a) is in the past for "today" in every UTC+ time zone, so the ignore
 * would be born expired, and (b) silently expires a day early east of UTC.
 */
export function expiryDateToIso(dateValue: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const endOfDay = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  return Number.isNaN(endOfDay.getTime()) ? undefined : endOfDay.toISOString();
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  showInput = false,
  inputLabel,
  inputPlaceholder,
  showExpiryDate = false,
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const expiryId = React.useId();

  React.useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setExpiresAt("");
    }
  }, [isOpen]);

  // Runs after Modal's own mount effect (child effects fire first), so the
  // reason field wins the initial focus when it is shown.
  React.useEffect(() => {
    if (isOpen && showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showInput]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const expiry = showExpiryDate && expiresAt ? expiryDateToIso(expiresAt) : undefined;
    onConfirm(showInput ? inputValue : undefined, expiry);
  };

  // Enter submits only from inside the text fields; Escape is handled by Modal.
  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  const expiryPreview = expiresAt ? expiryDateToIso(expiresAt) : undefined;

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="ax-help" style={{ margin: "0 0 16px" }}>
        {message}
      </p>

      {showInput && (
        <div className="ax-field">
          {inputLabel && (
            <label className="ax-label" htmlFor={inputId}>
              {inputLabel}
            </label>
          )}
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            className="ax-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            onKeyDown={handleFieldKeyDown}
          />
        </div>
      )}

      {showExpiryDate && (
        <div className="ax-field" style={{ marginBottom: 0 }}>
          <label className="ax-label" htmlFor={expiryId}>
            Expiry date (optional)
          </label>
          <input
            id={expiryId}
            type="date"
            className="ax-input"
            style={{ alignSelf: "flex-start" }}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            onKeyDown={handleFieldKeyDown}
            min={todayLocalIso()}
          />
          {expiryPreview && (
            <span className="ax-help">
              Ignore will expire on {new Date(expiryPreview).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </Modal>
  );
};
