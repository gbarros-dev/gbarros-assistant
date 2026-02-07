import { api } from "@zenthor-assist/backend/convex/_generated/api";
import type { Id } from "@zenthor-assist/backend/convex/_generated/dataModel";
import { tool } from "ai";
import { z } from "zod";

import { getConvexClient } from "../../convex/client";
import { generateEmbedding } from "./embed";

interface MemoryResult {
  content: string;
}

const memorySearchDescription =
  "Search your long-term memory for relevant past information, facts, or conversation context";

const memorySearchInputSchema = z.object({
  query: z.string().describe("What to search for in memory"),
  limit: z.number().optional().describe("Max results (default 5)"),
});

const memoryStoreDescription =
  "Store an important fact, preference, or piece of information in long-term memory for future reference";

const memoryStoreInputSchema = z.object({
  content: z.string().describe("The fact or information to remember"),
});

/** Create conversation-scoped memory tools. */
export function createMemoryTools(conversationId: Id<"conversations">) {
  const search = tool({
    description: memorySearchDescription,
    inputSchema: memorySearchInputSchema,
    execute: async ({ query, limit }) => {
      const embedding = await generateEmbedding(query);
      const client = getConvexClient();
      const results = (await client.action(api.memories.search, {
        embedding,
        limit: limit ?? 5,
        conversationId,
      })) as MemoryResult[];
      if (!results || results.length === 0) return "No relevant memories found.";
      return results.map((r) => r.content).join("\n\n---\n\n");
    },
  });

  const store = tool({
    description: memoryStoreDescription,
    inputSchema: memoryStoreInputSchema,
    execute: async ({ content }) => {
      const embedding = await generateEmbedding(content);
      const client = getConvexClient();
      await client.action(api.memories.store, {
        content,
        embedding,
        source: "manual",
        conversationId,
      });
      return `Stored in memory: "${content.substring(0, 100)}..."`;
    },
  });

  return { memory_search: search, memory_store: store };
}

/** Static tool instance for plugin registry (no conversationId — overridden per-job in loop.ts). */
export const memorySearch = tool({
  description: memorySearchDescription,
  inputSchema: memorySearchInputSchema,
  execute: async ({ query, limit }) => {
    const embedding = await generateEmbedding(query);
    const client = getConvexClient();
    const results = (await client.action(api.memories.search, {
      embedding,
      limit: limit ?? 5,
    })) as MemoryResult[];
    if (!results || results.length === 0) return "No relevant memories found.";
    return results.map((r) => r.content).join("\n\n---\n\n");
  },
});

/** Static tool instance for plugin registry (no conversationId — overridden per-job in loop.ts). */
export const memoryStore = tool({
  description: memoryStoreDescription,
  inputSchema: memoryStoreInputSchema,
  execute: async ({ content }) => {
    const embedding = await generateEmbedding(content);
    const client = getConvexClient();
    await client.action(api.memories.store, {
      content,
      embedding,
      source: "manual",
    });
    return `Stored in memory: "${content.substring(0, 100)}..."`;
  },
});
