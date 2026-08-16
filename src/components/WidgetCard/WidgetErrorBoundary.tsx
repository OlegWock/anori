import { Heading } from "@anori/design-system/components/Heading/Heading";
import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const errorDescriptionCss = css({ marginTop: "3" });

export const WidgetRenderError = () => {
  const { t } = useTranslation();
  return (
    <>
      <Heading>{t("widgetRenderError.title")}</Heading>
      <div className={errorDescriptionCss}>{t("widgetRenderError.description")}</div>
    </>
  );
};

export class WidgetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Error happened inside widget");
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return <WidgetRenderError />;
    }

    return this.props.children;
  }
}
