import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";

const field = css({ display: "flex", flexDirection: "column", gap: "1" });
const fieldLabel = css({ display: "flex", alignItems: "center", gap: "1" });
const fieldDescription = css({ color: "text.subtle", fontSize: "sm", marginBottom: "1" });

export type FieldProps = {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

// The wrapping <label> implicitly associates clicks/focus with the control passed as children.
export const Field = ({ label, description, children, className }: FieldProps) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is passed as children and wrapped by this label (implicit association), which biome can't see through the children prop
    <label className={cx(field, className)}>
      <span className={fieldLabel}>{label}</span>
      {!!description && <span className={fieldDescription}>{description}</span>}
      {children}
    </label>
  );
};
