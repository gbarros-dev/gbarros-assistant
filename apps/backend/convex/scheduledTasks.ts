import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { adminMutation, adminQuery, serviceMutation } from "./auth";

const scheduledTaskDoc = v.object({
  _id: v.id("scheduledTasks"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  cronExpression: v.optional(v.string()),
  intervalMs: v.optional(v.number()),
  payload: v.string(),
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  nextRunAt: v.optional(v.number()),
  conversationId: v.optional(v.id("conversations")),
  createdAt: v.number(),
});

export const list = adminQuery({
  args: {},
  returns: v.array(scheduledTaskDoc),
  handler: async (ctx) => {
    return await ctx.db.query("scheduledTasks").collect();
  },
});

export const get = adminQuery({
  args: { id: v.id("scheduledTasks") },
  returns: v.union(scheduledTaskDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = serviceMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    intervalMs: v.number(),
    payload: v.string(),
    enabled: v.boolean(),
    conversationId: v.optional(v.id("conversations")),
  },
  returns: v.id("scheduledTasks"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("scheduledTasks", {
      ...args,
      createdAt: now,
      nextRunAt: now + args.intervalMs,
    });
  },
});

export const update = adminMutation({
  args: {
    id: v.id("scheduledTasks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    intervalMs: v.optional(v.number()),
    payload: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    conversationId: v.optional(v.id("conversations")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const task = await ctx.db.get(id);
    if (!task) return null;

    // Recompute nextRunAt if intervalMs changed
    const patch: Record<string, unknown> = { ...fields };
    if (fields.intervalMs !== undefined) {
      patch.nextRunAt = Date.now() + fields.intervalMs;
    }

    await ctx.db.patch(id, patch);
    return null;
  },
});

export const remove = adminMutation({
  args: { id: v.id("scheduledTasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const cleanupOldJobs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldCompleted = await ctx.db
      .query("agentQueue")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => q.lt(q.field("_creationTime"), sevenDaysAgo))
      .collect();

    const oldFailed = await ctx.db
      .query("agentQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) => q.lt(q.field("_creationTime"), sevenDaysAgo))
      .collect();

    const oldJobs = [...oldCompleted, ...oldFailed];
    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
    }
    if (oldJobs.length > 0) {
      console.info(
        `[cron] Cleaned up ${oldJobs.length} old jobs (${oldCompleted.length} completed, ${oldFailed.length} failed)`,
      );
    }
  },
});

export const processDueTasks = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const dueTasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    for (const task of dueTasks) {
      if (task.nextRunAt && task.nextRunAt <= now) {
        // Update lastRunAt and compute next run
        const nextRunAt = task.intervalMs ? now + task.intervalMs : undefined;
        await ctx.db.patch(task._id, {
          lastRunAt: now,
          nextRunAt,
        });

        // If the task has a conversationId, create an agent job
        if (task.conversationId) {
          const messageId = await ctx.db.insert("messages", {
            conversationId: task.conversationId,
            role: "system",
            content: `[Scheduled Task: ${task.name}] ${task.payload}`,
            channel: "web",
            status: "sent",
          });
          await ctx.db.insert("agentQueue", {
            messageId,
            conversationId: task.conversationId,
            status: "pending",
          });
          console.info(
            `[cron] Triggered scheduled task "${task.name}" for conversation ${task.conversationId}`,
          );
        }
      }
    }
  },
});
