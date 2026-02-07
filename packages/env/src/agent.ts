import { z } from "zod";

const envSchema = z.object({
  CONVEX_URL: z.url(),
  AI_GATEWAY_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default("anthropic/claude-sonnet-4-20250514"),
  AI_FALLBACK_MODEL: z.string().optional(),
  AI_CONTEXT_WINDOW: z.coerce.number().optional(),
  AI_EMBEDDING_MODEL: z.string().default("openai/text-embedding-3-small"),
  AGENT_SECRET: z.string().min(1).optional(),
  AGENT_ROLE: z.enum(["all", "core", "whatsapp", "whatsapp-ingress", "whatsapp-egress"]).optional(),
  WORKER_ID: z.string().min(1).optional(),
  ENABLE_WHATSAPP: z.string().optional(),
  WHATSAPP_ACCOUNT_ID: z.string().min(1).optional(),
  WHATSAPP_PHONE: z.string().min(1).optional(),
  WHATSAPP_LEASE_TTL_MS: z.coerce.number().optional(),
  WHATSAPP_HEARTBEAT_MS: z.coerce.number().optional(),
});

export const env = envSchema.parse(process.env);
