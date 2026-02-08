import { v } from "convex/values";

import { adminMutation, adminQuery } from "./auth";

const toolPolicyValidator = v.optional(
  v.object({
    allow: v.optional(v.array(v.string())),
    deny: v.optional(v.array(v.string())),
  }),
);

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

export const list = adminQuery({
  args: {},
  returns: v.array(agentDoc),
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const get = adminQuery({
  args: { id: v.id("agents") },
  returns: v.union(agentDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getDefault = adminQuery({
  args: {},
  returns: v.union(agentDoc, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .first();
  },
});

export const getByName = adminQuery({
  args: { name: v.string() },
  returns: v.union(agentDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const create = adminMutation({
  args: {
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    model: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    enabled: v.boolean(),
    toolPolicy: toolPolicyValidator,
  },
  returns: v.id("agents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", args);
  },
});

export const update = adminMutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    toolPolicy: toolPolicyValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return null;
  },
});

export const remove = adminMutation({
  args: { id: v.id("agents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
