import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const getPendingJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const claimJob = mutation({
  args: { jobId: v.id("agentQueue") },
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
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();

    const agent = conversation.agentId ? await ctx.db.get(conversation.agentId) : null;

    return { conversation, user, contact, messages, skills, agent };
  },
});
