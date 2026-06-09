import { listItemAnimation } from "@anori/components/animations";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { Task } from "@anori/utils/storage";
import { AnimatePresence, m } from "framer-motion";
import { useTranslation } from "react-i18next";
import { scrollArea, taskInput, taskRow, tasksHeader, tasksList, tasksWidget } from "../styles";

export const Mock = () => {
  const { t } = useTranslation();
  const tasks: Task[] = [
    { id: "0", text: t("tasks-plugin.exampleTask0") },
    { id: "1", text: t("tasks-plugin.exampleTask1") },
    { id: "2", text: t("tasks-plugin.exampleTask2") },
    { id: "3", text: t("tasks-plugin.exampleTask3") },
  ];

  return (
    <div className={tasksWidget}>
      <div className={tasksHeader}>
        <h2>{t("tasks-plugin.todo")}</h2>
        <IconButton variant="ghost" icon={builtinIcons.add} label={t("add")} />
      </div>
      <ScrollArea className={scrollArea}>
        <m.div className={tasksList}>
          <AnimatePresence initial={false}>
            {tasks.map((t) => {
              return (
                <m.div key={t.id} className={taskRow} {...listItemAnimation}>
                  <Checkbox checked={false} />
                  <Input variant="ghost" className={taskInput} value={t.text} />
                </m.div>
              );
            })}
          </AnimatePresence>
        </m.div>
      </ScrollArea>
    </div>
  );
};
