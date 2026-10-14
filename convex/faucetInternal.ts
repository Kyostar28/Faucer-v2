// Internal queries and mutations for the faucet (V8 runtime - no "use node")
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getUserByWallet = internalQuery({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .unique();
  },
});

export const getUserByReferralCode = internalQuery({
  args: { referralCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .unique();
  },
});

export const getIpRecord = internalQuery({
  args: { ip: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ipLimits")
      .withIndex("by_ip", (q) => q.eq("ip", args.ip))
      .unique();
  },
});

export const insertIpRecord = internalMutation({
  args: { ip: v.string(), walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ipLimits", { ip: args.ip, walletAddress: args.walletAddress });
  },
});

export const createUser = internalMutation({
  args: { walletAddress: v.string(), referralCode: v.string(), referredBy: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      walletAddress: args.walletAddress,
      balanceLtc: 0,
      dailyStreak: 0,
      referralCode: args.referralCode,
      referredBy: args.referredBy,
      referralCount: 0,
      referralEarningsLtc: 0,
    });
  },
});

export const incrementReferralCount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    await ctx.db.patch(args.userId, { referralCount: (user.referralCount ?? 0) + 1 });
  },
});

export const addReferralBonus = internalMutation({
  args: { userId: v.id("users"), amountLtc: v.number(), date: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    await ctx.db.patch(args.userId, {
      balanceLtc: (user.balanceLtc ?? 0) + args.amountLtc,
      referralEarningsLtc: (user.referralEarningsLtc ?? 0) + args.amountLtc,
    });
    await ctx.db.insert("earningsHistory", {
      userId: args.userId,
      date: args.date,
      amountLtc: args.amountLtc,
      type: "referral",
    });
  },
});

export const patchUser = internalMutation({
  args: {
    userId: v.id("users"),
    balanceLtc: v.optional(v.number()),
    lastClaimTime: v.optional(v.string()),
    dailyStreak: v.optional(v.number()),
    lastDailyLoginDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...patch } = args;
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, val]) => val !== undefined)
    ) as Partial<{
      balanceLtc: number;
      lastClaimTime: string;
      dailyStreak: number;
      lastDailyLoginDate: string;
    }>;
    return await ctx.db.patch(userId, filtered);
  },
});

export const insertEarning = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    amountLtc: v.number(),
    type: v.union(v.literal("claim"), v.literal("daily"), v.literal("referral")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("earningsHistory", {
      userId: args.userId,
      date: args.date,
      amountLtc: args.amountLtc,
      type: args.type,
    });
  },
});

export const deductBalance = internalMutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    await ctx.db.patch(args.userId, { balanceLtc: (user.balanceLtc ?? 0) - args.amount });
  },
});
