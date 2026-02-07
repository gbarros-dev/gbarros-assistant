import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    name: v.string(),
    email: v.string(),
    emailVerified: v.optional(v.boolean()),
    image: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),

  contacts: defineTable({
    phone: v.string(),
    name: v.string(),
    isAllowed: v.boolean(),
  }).index("by_phone", ["phone"]),

  conversations: defineTable({
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
    userId: v.optional(v.id("users")),
    contactId: v.optional(v.id("contacts")),
    agentId: v.optional(v.id("agents")),
    title: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
  })
    .index("by_userId", ["userId"])
    .index("by_contactId", ["contactId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
    toolCalls: v.optional(v.any()),
    streaming: v.optional(v.boolean()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
  }).index("by_conversationId", ["conversationId"]),

  skills: defineTable({
    name: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    config: v.optional(
      v.object({
        systemPrompt: v.optional(v.string()),
        toolPolicy: v.optional(
          v.object({
            allow: v.optional(v.array(v.string())),
            deny: v.optional(v.array(v.string())),
          }),
        ),
      }),
    ),
  }).index("by_name", ["name"]),

  whatsappSession: defineTable({
    key: v.string(),
    data: v.string(),
  }).index("by_key", ["key"]),

  agentQueue: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    agentId: v.optional(v.id("agents")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    errorReason: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    attemptCount: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_conversationId", ["conversationId"]),

  agents: defineTable({
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    model: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    enabled: v.boolean(),
    toolPolicy: v.optional(
      v.object({
        allow: v.optional(v.array(v.string())),
        deny: v.optional(v.array(v.string())),
      }),
    ),
  }).index("by_name", ["name"]),

  memories: defineTable({
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    embedding: v.array(v.float64()),
    source: v.union(v.literal("conversation"), v.literal("manual")),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["source"],
    }),

  scheduledTasks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    cronExpression: v.optional(v.string()),
    intervalMs: v.optional(v.number()),
    payload: v.any(),
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    conversationId: v.optional(v.id("conversations")),
    createdAt: v.number(),
  })
    .index("by_enabled", ["enabled"])
    .index("by_nextRunAt", ["nextRunAt"]),

  toolApprovals: defineTable({
    conversationId: v.id("conversations"),
    jobId: v.id("agentQueue"),
    toolName: v.string(),
    toolInput: v.any(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    channel: v.union(v.literal("web"), v.literal("whatsapp")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_jobId", ["jobId"])
    .index("by_conversationId_status", ["conversationId", "status"]),
});
