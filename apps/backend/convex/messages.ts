import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getConversationIfOwner } from "./lib/auth";

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

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("web")),
  },
  returns: v.union(v.id("messages"), v.null()),
  handler: async (ctx, args) => {
    // Verify ownership when called by an authenticated user (web).
    // Agent calls have no identity and bypass this check (secured at network level).
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const conv = await getConversationIfOwner(ctx, args.conversationId);
      if (!conv) return null;
    }

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
  returns: v.id("messages"),
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
  returns: v.id("messages"),
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
  returns: v.id("messages"),
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
  returns: v.null(),
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
  returns: v.null(),
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
  returns: v.array(messageDoc),
  handler: async (ctx, args) => {
    const conv = await getConversationIfOwner(ctx, args.conversationId);
    if (!conv) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("messages") },
  returns: v.union(messageDoc, v.null()),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.id);
    if (!msg) return null;
    const conv = await getConversationIfOwner(ctx, msg.conversationId);
    if (!conv) return null;
    return msg;
  },
});
