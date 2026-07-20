import "../../panda.css";
import "./globals.css";
import { TooltipProvider } from "@anori/design-system/components/Tooltip/Tooltip";
import { initTranslation } from "@anori/translations/utils";
import { CompactModeProvider } from "@anori/utils/compact";
import { watchForPermissionChanges } from "@anori/utils/permissions";
import { mountPage } from "@anori/utils/react";
import { getAnoriStorage } from "@anori/utils/storage";
import { StorageContext } from "@anori/utils/storage-lib";
import { Popup } from "./components/Popup";

watchForPermissionChanges();

getAnoriStorage().then(async (storage) => {
  await initTranslation();

  mountPage(
    <StorageContext.Provider value={storage}>
      <CompactModeProvider>
        <TooltipProvider delay={200} closeDelay={100} timeout={0}>
          <Popup />
        </TooltipProvider>
      </CompactModeProvider>
    </StorageContext.Provider>,
  );
});
