import type { ButtonHTMLAttributes, Ref } from "react";
import { css, cx } from "styled-system/css";

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
