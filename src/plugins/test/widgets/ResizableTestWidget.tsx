import "../styles.scss";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";

export const ResizableTestWidget = (_Props: WidgetRenderProps<EmptyObject>) => {
  const { rem } = useSizeSettings();

  return (
    <div className="ExpandableTestWidget">
      <Icon icon={builtinIcons.logos.github} height={rem(4)} width={rem(4)} />
    </div>
  );
};
