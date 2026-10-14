import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUser = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .unique();
  },
});

export const getEarningsHistory = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("earningsHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
  },
});
