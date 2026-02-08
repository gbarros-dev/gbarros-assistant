import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { isValidServiceKey } from "./lib/auth";

const leaseDoc = v.object({
  _id: v.id("whatsappLeases"),
  _creationTime: v.number(),
  accountId: v.string(),
  ownerId: v.string(),
  expiresAt: v.number(),
  heartbeatAt: v.number(),
});

const accountDoc = v.object({
  _id: v.id("whatsappAccounts"),
  _creationTime: v.number(),
  accountId: v.string(),
  phone: v.string(),
  enabled: v.boolean(),
  meta: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const upsertAccount = mutation({
  args: {
    serviceKey: v.optional(v.string()),
    accountId: v.string(),
    phone: v.string(),
    enabled: v.boolean(),
    meta: v.optional(v.any()),
  },
  returns: v.union(v.id("whatsappAccounts"), v.null()),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return null;
    const now = Date.now();
    const existing = await ctx.db
      .query("whatsappAccounts")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phone: args.phone,
        enabled: args.enabled,
        meta: args.meta,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("whatsappAccounts", {
      accountId: args.accountId,
      phone: args.phone,
      enabled: args.enabled,
      meta: args.meta,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listEnabledAccounts = query({
  args: { serviceKey: v.optional(v.string()) },
  returns: v.array(accountDoc),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return [];
    const accounts = await ctx.db.query("whatsappAccounts").collect();
    return accounts.filter((a) => a.enabled);
  },
});

export const acquireLease = mutation({
  args: {
    serviceKey: v.optional(v.string()),
    accountId: v.string(),
    ownerId: v.string(),
    ttlMs: v.optional(v.number()),
  },
  returns: v.object({
    acquired: v.boolean(),
    ownerId: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return { acquired: false };
    const now = Date.now();
    const ttlMs = Math.max(10_000, args.ttlMs ?? 45_000);
    const existing = await ctx.db
      .query("whatsappLeases")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .first();

    if (existing && existing.ownerId !== args.ownerId && existing.expiresAt > now) {
      return {
        acquired: false,
        ownerId: existing.ownerId,
        expiresAt: existing.expiresAt,
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ownerId: args.ownerId,
        heartbeatAt: now,
        expiresAt: now + ttlMs,
      });
    } else {
      await ctx.db.insert("whatsappLeases", {
        accountId: args.accountId,
        ownerId: args.ownerId,
        heartbeatAt: now,
        expiresAt: now + ttlMs,
      });
    }

    return {
      acquired: true,
      ownerId: args.ownerId,
      expiresAt: now + ttlMs,
    };
  },
});

export const heartbeatLease = mutation({
  args: {
    serviceKey: v.optional(v.string()),
    accountId: v.string(),
    ownerId: v.string(),
    ttlMs: v.optional(v.number()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return false;
    const now = Date.now();
    const ttlMs = Math.max(10_000, args.ttlMs ?? 45_000);
    const lease = await ctx.db
      .query("whatsappLeases")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .first();

    if (!lease || lease.ownerId !== args.ownerId) return false;
    if (lease.expiresAt <= now) return false;

    await ctx.db.patch(lease._id, {
      heartbeatAt: now,
      expiresAt: now + ttlMs,
    });
    return true;
  },
});

export const releaseLease = mutation({
  args: {
    serviceKey: v.optional(v.string()),
    accountId: v.string(),
    ownerId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return false;
    const lease = await ctx.db
      .query("whatsappLeases")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .first();
    if (!lease || lease.ownerId !== args.ownerId) return false;
    await ctx.db.delete(lease._id);
    return true;
  },
});

export const listOwnedAccounts = query({
  args: { serviceKey: v.optional(v.string()), ownerId: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return [];
    const now = Date.now();
    const leases = await ctx.db
      .query("whatsappLeases")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    return leases.filter((l) => l.expiresAt > now).map((l) => l.accountId);
  },
});

export const getLease = query({
  args: { serviceKey: v.optional(v.string()), accountId: v.string() },
  returns: v.union(leaseDoc, v.null()),
  handler: async (ctx, args) => {
    if (!isValidServiceKey(args.serviceKey)) return null;
    return await ctx.db
      .query("whatsappLeases")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .first();
  },
});
