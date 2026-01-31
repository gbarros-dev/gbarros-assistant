import { z } from "zod";

const envSchema = z.object({
  CONVEX_URL: z.url(),
  AI_GATEWAY_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default("anthropic/claude-sonnet-4-20250514"),
  AGENT_SECRET: z.string().min(1).optional(),
  ENABLE_WHATSAPP: z.string().optional(),
});

export const env = envSchema.parse(process.env);
