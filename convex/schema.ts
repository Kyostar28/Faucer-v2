import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    walletAddress: v.string(),
    balanceLtc: v.optional(v.number()),
    balanceUsd: v.optional(v.number()), // legacy
    lastClaimTime: v.optional(v.string()),
    dailyStreak: v.number(),
    lastDailyLoginDate: v.optional(v.string()),
    referralCode: v.optional(v.string()),
    referredBy: v.optional(v.id("users")),
    referralCount: v.optional(v.number()),
    referralEarningsLtc: v.optional(v.number()),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_referral_code", ["referralCode"]),

  ipLimits: defineTable({
    ip: v.string(),
    walletAddress: v.string(),
  }).index("by_ip", ["ip"]),

  earningsHistory: defineTable({
    userId: v.id("users"),
    date: v.string(),
    amountLtc: v.optional(v.number()),
    amountUsd: v.optional(v.number()), // legacy
    type: v.union(v.literal("claim"), v.literal("daily"), v.literal("referral")),
  }).index("by_user", ["userId"]),
});
