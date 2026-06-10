import type { ButtonHTMLAttributes, Ref } from "react";
import { css, cx } from "styled-system/css";

// A button that reads as an inline text link — same colour as surrounding text, just underlined and
// a touch bolder — for in-sentence actions that aren't navigation, e.g. "apply this preset".
const textButton = css({
  display: "inline",
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  fontWeight: "medium",
  textDecoration: "underline",
  cursor: "pointer",
});

export const TextButton = ({
  className,
  ref,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { ref?: Ref<HTMLButtonElement> }) => {
  return <button ref={ref} type="button" className={cx(textButton, className)} {...props} />;
};
