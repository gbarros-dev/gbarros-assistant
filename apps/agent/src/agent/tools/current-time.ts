import type { ToolHandler } from "./index";

export const getCurrentTime: ToolHandler = {
  definition: {
    name: "get_current_time",
    description: "Get the current date and time",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone (e.g. America/Sao_Paulo). Defaults to UTC.",
        },
      },
      required: [],
    },
  },
  execute: async (input) => {
    const tz = (input["timezone"] as string) || "UTC";
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "long" });
  },
};
