import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConfirmDialog } from "../../src/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Test Title",
    message: "Test message",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when not open", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders title and message when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  test("renders confirm and cancel buttons", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("OK"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, undefined);
  });

  test("calls onCancel when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test("calls onCancel when backdrop is clicked", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    // The outermost div is the backdrop; the kit Modal closes on mousedown
    // directly on it (not on clicks that started inside the dialog).
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test("renders input field when showInput is true", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        showInput={true}
        inputLabel="Reason"
        inputPlaceholder="Enter reason"
      />
    );
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter reason")).toBeInTheDocument();
  });

  test("passes input value on confirm when showInput is true", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        showInput={true}
        inputLabel="Reason"
        inputPlaceholder="Enter reason"
      />
    );
    const input = screen.getByPlaceholderText("Enter reason");
    fireEvent.change(input, { target: { value: "My reason" } });
    fireEvent.click(screen.getByText("OK"));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith("My reason", undefined);
  });

  test("renders expiry date picker when showExpiryDate is true", () => {
    render(<ConfirmDialog {...defaultProps} showInput={true} showExpiryDate={true} />);
    expect(screen.getByText("Expiry date (optional)")).toBeInTheDocument();
  });

  test("passes expiresAt on confirm when date is set", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        showInput={true}
        showExpiryDate={true}
        inputPlaceholder="Enter reason"
      />
    );
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: "2027-06-15" } });
    fireEvent.click(screen.getByText("OK"));
    // Should have been called with the input value and an ISO date string
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    const call = defaultProps.onConfirm.mock.calls[0];
    expect(call[0]).toBe(""); // empty input value
    // The expiry is the end of the chosen day in local time, so the ignore
    // stays active for the whole of that date rather than lapsing at 00:00 UTC.
    const expiry = new Date(call[1]);
    expect(expiry.getFullYear()).toBe(2027);
    expect(expiry.getMonth()).toBe(5);
    expect(expiry.getDate()).toBe(15);
    expect(expiry.getHours()).toBe(23);
    expect(expiry.getMinutes()).toBe(59);
  });

  test("choosing today as the expiry yields an expiry still in the future", () => {
    render(<ConfirmDialog {...defaultProps} showInput={true} showExpiryDate={true} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    fireEvent.change(dateInput, { target: { value: today } });
    fireEvent.click(screen.getByText("OK"));
    const call = defaultProps.onConfirm.mock.calls[0];
    expect(new Date(call[1]).getTime()).toBeGreaterThan(Date.now());
  });

  test("pressing Enter in the reason field confirms", () => {
    render(<ConfirmDialog {...defaultProps} showInput={true} inputPlaceholder="Enter reason" />);
    const input = screen.getByPlaceholderText("Enter reason");
    fireEvent.change(input, { target: { value: "typed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onConfirm).toHaveBeenCalledWith("typed", undefined);
  });

  test("pressing Enter on the cancel button does not confirm", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(screen.getByText("Cancel"), { key: "Enter" });
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  test("pressing Escape cancels", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(screen.getByText("Test Title"), { key: "Escape" });
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test("does not show input field when showInput is false", () => {
    render(<ConfirmDialog {...defaultProps} showInput={false} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
