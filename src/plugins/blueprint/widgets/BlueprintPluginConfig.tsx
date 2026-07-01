import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import { useState } from "react";
import { css } from "styled-system/css";
import type { BlueprintPluginConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const save = css({ alignSelf: "center", marginTop: "4" });

// Plugin-level configuration screen — edited once for the whole plugin (shown in Settings), then exposed
// to every widget as `pluginConfig` and to background tasks via `ctx.getConfig()`.
export const BlueprintPluginConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: {
  currentConfig?: BlueprintPluginConfig;
  saveConfiguration: (config: BlueprintPluginConfig) => void;
}) => {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey ?? "");

  return (
    <div className={config}>
      <Field label="API key">
        <Input value={apiKey} onValueChange={setApiKey} placeholder="Shared across all widgets" />
      </Field>
      <Button className={save} onClick={() => saveConfiguration({ apiKey })}>
        Save
      </Button>
    </div>
  );
};
