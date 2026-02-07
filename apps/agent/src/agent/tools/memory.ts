import { api } from "@zenthor-assist/backend/convex/_generated/api";
import { tool } from "ai";
import { z } from "zod";

import { getConvexClient } from "../../convex/client";
import { generateEmbedding } from "./embed";

interface MemoryResult {
  content: string;
}

export const memorySearch = tool({
  description:
    "Search your long-term memory for relevant past information, facts, or conversation context",
  inputSchema: z.object({
    query: z.string().describe("What to search for in memory"),
    limit: z.number().optional().describe("Max results (default 5)"),
  }),
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

export const memoryStore = tool({
  description:
    "Store an important fact, preference, or piece of information in long-term memory for future reference",
  inputSchema: z.object({
    content: z.string().describe("The fact or information to remember"),
  }),
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
