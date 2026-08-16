import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { css } from "styled-system/css";
import { OpenAnoriRow } from "./OpenAnoriRow";
import { RecentlyStashed } from "./RecentlyStashed";
import { StashActions } from "./StashActions";

const popupScroll = css({ maxHeight: "570px" });
const backdrop = css({ padding: "5", display: "flex", flexDirection: "column", gap: "3" });

export const Popup = () => {
  return (
    <ScrollArea type="hover" className={popupScroll}>
      <div className={backdrop}>
        <StashActions />
        <RecentlyStashed />
        <OpenAnoriRow />
      </div>
    </ScrollArea>
  );
};
