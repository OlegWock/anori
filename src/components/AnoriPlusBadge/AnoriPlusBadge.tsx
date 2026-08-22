import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";

export type AnoriPlusBadgeProps = {
  withIcon?: boolean;
  className?: string;
};

export const AnoriPlusBadge = ({ withIcon = true, className }: AnoriPlusBadgeProps) => {
  return (
    <Badge variant="accent" icon={withIcon ? builtinIcons.cloud : undefined} className={className}>
      Plus
    </Badge>
  );
};
