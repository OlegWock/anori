import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useSizeSettings } from "@anori/utils/compact";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { memo } from "react";
import { widget } from "../styles";

export const ResizableTestWidget = memo(function ResizableTestWidget(_Props: WidgetRenderProps<EmptyObject>) {
  const { rem } = useSizeSettings();

  return (
    <div className={widget}>
      <Icon icon={builtinIcons.logos.github} height={rem(4)} width={rem(4)} />
    </div>
  );
});
