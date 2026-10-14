"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ── LTC address validation ──
function isValidLtcAddress(addr: string): boolean {
  return (
    /^[LMmN][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(addr) ||
    /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr) ||
    /^ltc1[a-z0-9]{6,87}$/.test(addr)
  );
}

// ── Fetch real LTC price from CoinGecko ──
async function fetchLtcPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd"
  );
  const data = await res.json() as { litecoin?: { usd?: number } };
  const price = data.litecoin?.usd;
  if (!price) throw new Error("Could not fetch LTC price");
  return price;
}

// ── Generate short referral code from wallet ──
function generateReferralCode(wallet: string): string {
  // Take last 8 chars + random 4-char suffix for uniqueness
  return wallet.slice(-6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ── Public actions ──

export const loginWithWallet = action({
  args: { walletAddress: v.string(), ip: v.string(), referralCode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"users">> => {
    if (!isValidLtcAddress(args.walletAddress)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid Litecoin wallet address" });
    }

    const ipRecord = await ctx.runQuery(internal.faucetInternal.getIpRecord, { ip: args.ip });
    if (ipRecord && ipRecord.walletAddress !== args.walletAddress) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This IP address is already associated with another wallet",
      });
    }

    const user = await ctx.runQuery(internal.faucetInternal.getUserByWallet, { walletAddress: args.walletAddress });
    if (!user) {
      // Resolve referrer if code provided
      let referrerId: Id<"users"> | undefined;
      if (args.referralCode) {
        const referrer = await ctx.runQuery(internal.faucetInternal.getUserByReferralCode, { referralCode: args.referralCode });
        if (referrer && referrer.walletAddress !== args.walletAddress) {
          referrerId = referrer._id;
          await ctx.runMutation(internal.faucetInternal.incrementReferralCount, { userId: referrer._id });
        }
      }
      const newCode = generateReferralCode(args.walletAddress);
      const id = await ctx.runMutation(internal.faucetInternal.createUser, {
        walletAddress: args.walletAddress,
        referralCode: newCode,
        referredBy: referrerId,
      });
      if (!ipRecord) {
        await ctx.runMutation(internal.faucetInternal.insertIpRecord, { ip: args.ip, walletAddress: args.walletAddress });
      }
      return id;
    }
    if (!ipRecord) {
      await ctx.runMutation(internal.faucetInternal.insertIpRecord, { ip: args.ip, walletAddress: args.walletAddress });
    }
    return user._id;
  },
});

export const claim = action({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<{ reward: number; rewardUsd: number }> => {
    const user = await ctx.runQuery(internal.faucetInternal.getUserByWallet, { walletAddress: args.walletAddress });
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const now = new Date();
    const COOLDOWN_MS = 4 * 60 * 1000;

    if (user.lastClaimTime) {
      const elapsed = now.getTime() - new Date(user.lastClaimTime).getTime();
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        throw new ConvexError({ code: "BAD_REQUEST", message: `Cooldown active. Wait ${remaining} seconds.` });
      }
    }

    const ltcPrice = await fetchLtcPrice();
    // Random reward between $0.0001 and $0.0005 USD, converted to LTC
    const rewardUsd = 0.0001 + Math.random() * 0.0004;
    const rewardLtc = rewardUsd / ltcPrice;
    const today = now.toISOString().split("T")[0];

    await ctx.runMutation(internal.faucetInternal.patchUser, {
      userId: user._id,
      balanceLtc: (user.balanceLtc ?? 0) + rewardLtc,
      lastClaimTime: now.toISOString(),
    });

    await ctx.runMutation(internal.faucetInternal.insertEarning, {
      userId: user._id,
      date: today,
      amountLtc: rewardLtc,
      type: "claim",
    });

    // Pay 25% referral bonus to referrer
    if (user.referredBy) {
      const referralBonus = rewardLtc * 0.25;
      await ctx.runMutation(internal.faucetInternal.addReferralBonus, {
        userId: user.referredBy,
        amountLtc: referralBonus,
        date: today,
      });
    }

    return { reward: rewardLtc, rewardUsd };
  },
});

export const dailyLogin = action({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<{ reward: number; streak: number }> => {
    const user = await ctx.runQuery(internal.faucetInternal.getUserByWallet, { walletAddress: args.walletAddress });
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const today = new Date().toISOString().split("T")[0];
    if (user.lastDailyLoginDate === today) {
      throw new ConvexError({ code: "CONFLICT", message: "Daily bonus already claimed today" });
    }

    let streak = user.dailyStreak;
    if (user.lastDailyLoginDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      streak = user.lastDailyLoginDate === yesterdayStr ? (streak % 7) + 1 : 1;
    } else {
      streak = 1;
    }

    const ltcPrice = await fetchLtcPrice();
    // x5 daily rewards
    const dailyRewardsUsd = [0.0005, 0.001, 0.0015, 0.002, 0.0025, 0.004, 0.005];
    const rewardUsd = dailyRewardsUsd[streak - 1];
    const rewardLtc = rewardUsd / ltcPrice;

    await ctx.runMutation(internal.faucetInternal.patchUser, {
      userId: user._id,
      balanceLtc: (user.balanceLtc ?? 0) + rewardLtc,
      dailyStreak: streak,
      lastDailyLoginDate: today,
    });

    await ctx.runMutation(internal.faucetInternal.insertEarning, {
      userId: user._id,
      date: today,
      amountLtc: rewardLtc,
      type: "daily",
    });

    return { reward: rewardLtc, streak };
  },
});

export const withdraw = action({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const MIN_LTC = 0.001;
    const user = await ctx.runQuery(internal.faucetInternal.getUserByWallet, { walletAddress: args.walletAddress });
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    if ((user.balanceLtc ?? 0) < MIN_LTC) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Minimum withdrawal is ${MIN_LTC} LTC`,
      });
    }

    await ctx.runMutation(internal.faucetInternal.deductBalance, {
      userId: user._id,
      amount: user.balanceLtc ?? 0,
    });
    return { success: true };
  },
});
