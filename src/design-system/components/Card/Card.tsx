import { styled } from "styled-system/jsx";

// Surface primitive: a solid card using the design-system surface/border tokens. Built on Panda's
// `styled` factory, so it also accepts any Panda style prop (p, m, gap, borderRadius, …) for
// overrides and `as` for polymorphism. Defaults below are the resting card look.
export const Card = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "surface",
    // Edge (DS-3): a 1px inset ring for volume, not a delineating border.
    boxShadow: "surface.edge",
    color: "text.primary",
    padding: "5",
    borderRadius: "lg",
  },
});
