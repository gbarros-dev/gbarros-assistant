import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const agentQueueDoc = v.object({
  _id: v.id("agentQueue"),
  _creationTime: v.number(),
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
});

const toolPolicyValidator = v.optional(
  v.object({
    allow: v.optional(v.array(v.string())),
    deny: v.optional(v.array(v.string())),
  }),
);

const skillDoc = v.object({
  _id: v.id("skills"),
  _creationTime: v.number(),
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
});

const agentDoc = v.object({
  _id: v.id("agents"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  systemPrompt: v.string(),
  model: v.optional(v.string()),
  fallbackModel: v.optional(v.string()),
  enabled: v.boolean(),
  toolPolicy: toolPolicyValidator,
});

const userDoc = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  externalId: v.string(),
  name: v.string(),
  email: v.string(),
  emailVerified: v.optional(v.boolean()),
  image: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("inactive")),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const contactDoc = v.object({
  _id: v.id("contacts"),
  _creationTime: v.number(),
  phone: v.string(),
  name: v.string(),
  isAllowed: v.boolean(),
});

const conversationDoc = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  channel: v.union(v.literal("whatsapp"), v.literal("web")),
  userId: v.optional(v.id("users")),
  contactId: v.optional(v.id("contacts")),
  agentId: v.optional(v.id("agents")),
  title: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("archived")),
});

const messageDoc = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
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
});

export const getPendingJobs = query({
  args: {},
  returns: v.array(agentQueueDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("agentQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const claimJob = mutation({
  args: { jobId: v.id("agentQueue") },
  returns: v.union(agentQueueDoc, v.null()),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "pending") return null;

    await ctx.db.patch(args.jobId, { status: "processing" });
    return job;
  },
});

export const completeJob = mutation({
  args: {
    jobId: v.id("agentQueue"),
    modelUsed: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      modelUsed: args.modelUsed,
    });
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id("agentQueue"),
    errorReason: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorReason: args.errorReason,
      errorMessage: args.errorMessage,
    });
  },
});

export const retryJob = mutation({
  args: { jobId: v.id("agentQueue") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return false;
    const attemptCount = (job.attemptCount ?? 0) + 1;
    if (attemptCount >= 3) return false;
    await ctx.db.patch(args.jobId, {
      status: "pending",
      attemptCount,
      errorReason: undefined,
      errorMessage: undefined,
    });
    return true;
  },
});

export const isProcessing = query({
  args: { conversationId: v.id("conversations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("agentQueue")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return jobs.some((j) => j.status === "pending" || j.status === "processing");
  },
});

export const getConversationContext = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      conversation: conversationDoc,
      user: v.union(userDoc, v.null()),
      contact: v.union(contactDoc, v.null()),
      messages: v.array(messageDoc),
      skills: v.array(skillDoc),
      agent: v.union(agentDoc, v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const user = conversation.userId ? await ctx.db.get(conversation.userId) : null;
    const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const skills = await ctx.db
      .query("skills")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    const agent = conversation.agentId ? await ctx.db.get(conversation.agentId) : null;

    return { conversation, user, contact, messages, skills, agent };
  },
});
