import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      channel: args.channel,
      status: "sent",
    });

    const conversation = await ctx.db.get(args.conversationId);
    if (conversation && (!conversation.title || conversation.title === "New chat")) {
      const title = args.content.length > 50 ? `${args.content.slice(0, 50)}…` : args.content;
      await ctx.db.patch(args.conversationId, { title });
    }

    await ctx.db.insert("agentQueue", {
      messageId,
      conversationId: args.conversationId,
      status: "pending",
    });

    return messageId;
  },
});

export const addAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      channel: args.channel,
      toolCalls: args.toolCalls,
      status: "sent",
    });
  },
});

export const addSummaryMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "system",
      content: args.content,
      channel: args.channel,
      status: "sent",
    });
  },
});

export const createPlaceholder = mutation({
  args: {
    conversationId: v.id("conversations"),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      channel: args.channel,
      streaming: true,
      status: "pending",
    });
  },
});

export const updateStreamingContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { content: args.content });
  },
});

export const finalizeMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      toolCalls: args.toolCalls,
      streaming: false,
      status: "sent",
    });
  },
});

export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
