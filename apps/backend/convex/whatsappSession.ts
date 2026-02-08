import { v } from "convex/values";

import { serviceMutation, serviceQuery } from "./auth";

export const get = serviceQuery({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("whatsappSession")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return doc?.data ?? null;
  },
});

export const set = serviceMutation({
  args: { key: v.string(), data: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSession")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data });
    } else {
      await ctx.db.insert("whatsappSession", {
        key: args.key,
        data: args.data,
      });
    }
    return null;
  },
});

export const remove = serviceMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSession")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const getAll = serviceQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("whatsappSession"),
      _creationTime: v.number(),
      key: v.string(),
      data: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("whatsappSession").collect();
  },
});

export const clearAll = serviceMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const all = await ctx.db.query("whatsappSession").collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return all.length;
  },
});
