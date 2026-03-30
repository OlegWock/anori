import "../styles.scss";
import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { Input } from "@anori/components/Input";
import { ScrollArea } from "@anori/components/ScrollArea";
import { listItemAnimation } from "@anori/components/animations";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import type { Task } from "@anori/utils/storage";
import { AnimatePresence, m } from "framer-motion";
import { useTranslation } from "react-i18next";

export const Mock = () => {
  const { t } = useTranslation();
  const tasks: Task[] = [
    { id: "0", text: t("tasks-plugin.exampleTask0") },
    { id: "1", text: t("tasks-plugin.exampleTask1") },
    { id: "2", text: t("tasks-plugin.exampleTask2") },
    { id: "3", text: t("tasks-plugin.exampleTask3") },
  ];

  return (
    <div className="TasksWidget">
      <div className="tasks-header">
        <h2>{t("tasks-plugin.todo")}</h2>
        <Button>
          <Icon icon={builtinIcons.add} height={16} />
        </Button>
      </div>
      <ScrollArea color="dark">
        <m.div className="tasks-list">
          <AnimatePresence initial={false}>
            {tasks.map((t) => {
              return (
                <m.div key={t.id} className="task" {...listItemAnimation}>
                  <Checkbox checked={false} />
                  <Input value={t.text} />
                </m.div>
              );
            })}
          </AnimatePresence>
        </m.div>
      </ScrollArea>
    </div>
  );
};
