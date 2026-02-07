import { currentTime } from "./current-time";
import { memorySearch, memoryStore } from "./memory";
import { scheduleTask } from "./schedule";

export const tools = {
  get_current_time: currentTime,
  memory_search: memorySearch,
  memory_store: memoryStore,
  schedule_task: scheduleTask,
};
