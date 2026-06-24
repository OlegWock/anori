import { styled } from "styled-system/jsx";

export const Card = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "surface",
    boxShadow: "surface.edge",
    color: "text.primary",
    padding: "5",
    borderRadius: "lg",
  },
});
