import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";

const field = css({ display: "flex", flexDirection: "column", gap: "1" });
// flex/center so a label with an inline hint or icon lines up with the text.
const fieldLabel = css({ display: "flex", alignItems: "center", gap: "1" });
// Helper text under the label; muted and a touch separated from the control below.
const fieldDescription = css({ color: "text.subtle", fontSize: "sm", marginBottom: "1" });

export type FieldProps = {
  // Shown above the control. Can be a string or richer node (e.g. text + a hint icon).
  label: ReactNode;
  // Optional helper text rendered between the label and the control.
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

// Stacks a label above the control it wraps (a Select/Input/Slider/…), with consistent spacing and
// alignment. The wrapping <label> implicitly associates clicks/focus with the control inside.
export const Field = ({ label, description, children, className }: FieldProps) => {
  return (
    <label className={cx(field, className)}>
      <span className={fieldLabel}>{label}</span>
      {!!description && <span className={fieldDescription}>{description}</span>}
      {children}
    </label>
  );
};
