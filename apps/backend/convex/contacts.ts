import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getAuthUser, isValidServiceKey } from "./lib/auth";

export const getByPhone = query({
  args: { serviceKey: v.optional(v.string()), phone: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("contacts"),
      _creationTime: v.number(),
      phone: v.string(),
      name: v.string(),
      isAllowed: v.boolean(),
      userId: v.optional(v.id("users")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return null;
    return await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const create = mutation({
  args: {
    serviceKey: v.optional(v.string()),
    phone: v.string(),
    name: v.string(),
    isAllowed: v.boolean(),
  },
  returns: v.union(v.id("contacts"), v.null()),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return null;
    return await ctx.db.insert("contacts", {
      phone: args.phone,
      name: args.name,
      isAllowed: args.isAllowed,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    isAllowed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("contacts"),
      _creationTime: v.number(),
      phone: v.string(),
      name: v.string(),
      isAllowed: v.boolean(),
      userId: v.optional(v.id("users")),
    }),
  ),
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];
    return await ctx.db.query("contacts").collect();
  },
});
