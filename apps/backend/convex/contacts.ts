import { v } from "convex/values";

import { adminMutation, adminQuery, serviceMutation, serviceQuery } from "./auth";

export const getByPhone = serviceQuery({
  args: { phone: v.string() },
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
    return await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const create = serviceMutation({
  args: {
    phone: v.string(),
    name: v.string(),
    isAllowed: v.boolean(),
  },
  returns: v.id("contacts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("contacts", {
      phone: args.phone,
      name: args.name,
      isAllowed: args.isAllowed,
    });
  },
});

export const update = adminMutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    isAllowed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return null;
  },
});

export const list = adminQuery({
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
    return await ctx.db.query("contacts").collect();
  },
});
