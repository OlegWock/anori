import { MenuItem, MenuList } from "@anori/design-system/components/MenuList/MenuList";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useAtom } from "jotai";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { settingsSections } from "./sections";
import { currentScreenAtom, type SettingScreen } from "./settings-atoms";

// A fixed-size two-column shell (sidebar list + screen), so the modal doesn't jump as sections of
// different heights swap; each column scrolls on its own.
const content = css({
  display: "flex",
  flexDirection: "column",
  width: "min(90vw, 880px)",
  height: "calc(80dvh - 6rem)",
});
const twoColumn = css({ display: "flex", gap: "4", flex: 1, overflow: "hidden", px: "4", pb: "4" });
const sidebar = css({ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column" });
const listScroll = css({ flex: 1 });
const divider = css({
  height: "100%",
  borderRightWidth: "1px",
  borderRightStyle: "solid",
  borderRightColor: "divider",
});
const screenScroll = css({ flex: 1 });
const screenPad = css({ paddingInline: "4", paddingBottom: "4" });

// Screens slide vertically by their relative position (like switching folders): going to a later
// section enters from below / exits upward, and vice-versa.
const screenVariants = {
  center: { y: "0%", opacity: 1 },
  enter: (dir: "up" | "down") => ({ y: dir === "down" ? "12%" : "-12%", opacity: 0 }),
  exit: (dir: "up" | "down") => ({ y: dir === "down" ? "-12%" : "12%", opacity: 0 }),
};

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [screen, setScreen] = useAtom(currentScreenAtom);
  const [direction, setDirection] = useState<"up" | "down">("down");

  const currentIndex = Math.max(
    settingsSections.findIndex((s) => s.id === screen),
    0,
  );
  const active = settingsSections[currentIndex];
  const ActiveScreen = active.Component;

  const selectScreen = (id: SettingScreen) => {
    const nextIndex = settingsSections.findIndex((s) => s.id === id);
    setDirection(nextIndex > currentIndex ? "down" : "up");
    setScreen(id);
  };

  return (
    <Modal title={t("settings.title")} flush closable onClose={onClose}>
      <div className={content}>
        <div className={twoColumn}>
          <div className={sidebar}>
            <ScrollArea className={listScroll}>
              <MenuList>
                {settingsSections.map((section) => (
                  <MenuItem
                    key={section.id}
                    icon={section.icon}
                    active={section.id === active.id}
                    onClick={() => selectScreen(section.id)}
                  >
                    {t(section.titleKey)}
                  </MenuItem>
                ))}
              </MenuList>
            </ScrollArea>
          </div>

          <div className={divider} />

          <ScrollArea className={screenScroll} contentClassName={screenPad}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <ActiveScreen
                key={active.id}
                custom={direction}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.065 }}
              />
            </AnimatePresence>
          </ScrollArea>
        </div>
      </div>
    </Modal>
  );
};

console.log("Settings modal loaded");
