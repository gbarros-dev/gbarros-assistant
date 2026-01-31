import { z } from "zod";

const envSchema = z.object({
  CONVEX_URL: z.url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  AGENT_SECRET: z.string().min(1).optional(),
  ENABLE_WHATSAPP: z.string().optional(),
});

export const env = envSchema.parse(process.env);
