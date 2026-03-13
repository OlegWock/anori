import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { type TasksWidgetStore, anoriSchema } from "@anori/utils/storage";

export const { useStore: useTasksStore } = createScopedStoreFactories<TasksWidgetStore>(
  anoriSchema.tasksWidgetStore.store,
);
