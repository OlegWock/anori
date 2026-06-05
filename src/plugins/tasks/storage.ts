import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema, type TasksWidgetStore } from "@anori/utils/storage";

export const { useStore: useTasksStore } = createScopedStoreFactories<TasksWidgetStore>(
  anoriSchema.tasksWidgetStore.store,
);
