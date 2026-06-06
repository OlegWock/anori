import { styled } from "styled-system/jsx";

// Surface primitive: a solid card using the design-system surface/border tokens. Built on Panda's
// `styled` factory, so it also accepts any Panda style prop (p, m, gap, borderRadius, …) for
// overrides and `as` for polymorphism. Defaults below are the resting card look.
export const Card = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "surface",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    color: "text.primary",
    padding: "5",
    borderRadius: "lg",
  },
});
