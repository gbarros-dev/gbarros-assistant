import { tool } from "ai";
import { z } from "zod";

export const currentTime = tool({
  description: "Get the current date and time",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe("IANA timezone (e.g. America/Sao_Paulo). Defaults to UTC."),
  }),
  execute: async ({ timezone }) => {
    const tz = timezone ?? "UTC";
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "long" });
  },
});
