import { styled } from "styled-system/jsx";

// Surface primitive: a solid card using the design-system `card` surface tokens. Built on Panda's
// `styled` factory, so it also accepts any Panda style prop (p, m, gap, borderRadius, …) for
// overrides and `as` for polymorphism. Defaults below are the resting card look.
export const Card = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "card",
    // Edge (DS-3): a 1px inset ring for volume, not a delineating border.
    boxShadow: "card.edge",
    color: "text.primary",
    padding: "5",
    borderRadius: "lg",
  },
});
