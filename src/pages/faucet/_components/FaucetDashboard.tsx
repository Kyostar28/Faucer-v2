import { useState, useEffect, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Droplets, LogOut, Copy, ExternalLink, ArrowDownToLine, Coins, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import MathCaptcha from "@/components/MathCaptcha.tsx";
import EarningsChart from "./EarningsChart.tsx";
import DailyBonus from "./DailyBonus.tsx";
import ReferralPanel from "./ReferralPanel.tsx";

// LTC logo
function LtcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="url(#ltcIconBg)" />
      <text x="16" y="23" textAnchor="middle" fontSize="18" fontWeight="bold" fill="white" fontFamily="Arial">Ł</text>
      <defs>
        <linearGradient id="ltcIconBg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B9FFF" />
          <stop offset="1" stopColor="#38CFCF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// LTC price hook
function useLtcPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd&include_24hr_change=true"
        );
        const data = await res.json() as { litecoin?: { usd?: number; usd_24h_change?: number } };
        if (data.litecoin?.usd) setPrice(data.litecoin.usd);
        if (data.litecoin?.usd_24h_change !== undefined) setChange24h(data.litecoin.usd_24h_change ?? null);
      } catch {
        // silently fail
      }
    };
    void fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  return { price, change24h };
}

// Cooldown timer hook
function useCooldown(lastClaimTime?: string) {
  const COOLDOWN_MS = 4 * 60 * 1000;
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!lastClaimTime) { setRemaining(0); return; }
    const tick = () => {
      const elapsed = Date.now() - new Date(lastClaimTime).getTime();
      const rem = Math.max(0, COOLDOWN_MS - elapsed);
      setRemaining(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastClaimTime, COOLDOWN_MS]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { remaining, label: `${mins}:${secs.toString().padStart(2, "0")}` };
}

// Anti-adblock detector
function useAdBlockDetection() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);

  useEffect(() => {
    const checkAdBlock = async () => {
      try {
        // Try fetching a typical ad-serving URL pattern
        const res = await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
          method: "HEAD",
          mode: "no-cors",
        });
        // If we get here without throwing, no adblock (or CORS block = no adblocker)
        void res;
        setAdBlockDetected(false);
      } catch {
        setAdBlockDetected(true);
      }

      // Also check via DOM bait
      const bait = document.createElement("div");
      bait.className = "adsbox ad-placement banner-ads";
      bait.style.cssText = "height:1px;width:1px;position:absolute;left:-9999px;top:-9999px;";
      document.body.appendChild(bait);
      await new Promise((r) => setTimeout(r, 100));
      if (bait.offsetHeight === 0 || bait.offsetWidth === 0) {
        setAdBlockDetected(true);
      }
      document.body.removeChild(bait);
    };

    void checkAdBlock();
  }, []);

  return adBlockDetected;
}

type Props = {
  walletAddress: string;
  onLogout: () => void;
};

export default function FaucetDashboard({ walletAddress, onLogout }: Props) {
  const { price, change24h } = useLtcPrice();
  const user = useQuery(api.queries.getUser, { walletAddress });
  const claimAction = useAction(api.faucet.claim);
  const dailyAction = useAction(api.faucet.dailyLogin);
  const withdrawAction = useAction(api.faucet.withdraw);
  const adBlockDetected = useAdBlockDetection();

  const [captchaOk, setCaptchaOk] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  const { remaining, label: cooldownLabel } = useCooldown(user?.lastClaimTime);
  const canClaim = remaining === 0 && captchaOk && !adBlockDetected;

  const MIN_WITHDRAW_LTC = 0.001;
  const balanceLtc = user?.balanceLtc ?? 0;

  const handleClaim = useCallback(async () => {
    if (!canClaim) return;
    setClaiming(true);
    try {
      const result = await claimAction({ walletAddress }) as { reward: number; rewardUsd: number };
      toast.success(`+${result.reward.toFixed(8)} LTC claimed! (~$${result.rewardUsd.toFixed(5)})`, { icon: "💧" });
      setClaimSuccess(true);
      setCaptchaOk(false);
      setCaptchaKey((k) => k + 1);
      setTimeout(() => setClaimSuccess(false), 2000);
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("Claim failed. Try again.");
      }
    } finally {
      setClaiming(false);
    }
  }, [canClaim, claimAction, walletAddress]);

  const handleDaily = async () => {
    setDailyLoading(true);
    try {
      const result = await dailyAction({ walletAddress }) as { reward: number; streak: number };
      toast.success(`Day ${result.streak} bonus: +${result.reward.toFixed(8)} LTC!`, { icon: "🎁" });
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      }
    } finally {
      setDailyLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    if (balanceLtc < MIN_WITHDRAW_LTC) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAW_LTC} LTC`);
      return;
    }
    setWithdrawLoading(true);
    try {
      await withdrawAction({ walletAddress });
      toast.success("Withdrawal request submitted!", { icon: "🚀" });
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      }
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyWallet = () => {
    void navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied!");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#6B9FFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  const usdValue = price ? balanceLtc * price : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* AdBlock Warning Banner */}
      <AnimatePresence>
        {adBlockDetected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Ad Blocker Detected</p>
              <p className="text-xs text-amber-400/80 mt-1">
                This faucet relies on ads to stay free. Please disable your ad blocker extension for this site, then refresh the page to claim rewards.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B9FFF] to-[#38CFCF] flex items-center justify-center shadow-md shadow-[#6B9FFF]/30">
            <LtcIcon size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] bg-clip-text text-transparent leading-none">
              LTC Faucet
            </h1>
            <button
              onClick={copyWallet}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <span className="font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* LTC Price */}
        <div className="flex items-center gap-3">
          {price && (
            <div className="hidden sm:flex items-center gap-2 bg-card/60 border border-border rounded-xl px-3 py-2 backdrop-blur-sm">
              <LtcIcon size={18} />
              <div>
                <span className="text-sm font-bold font-mono text-white">${price.toFixed(2)}</span>
                {change24h !== null && (
                  <span className={`text-[10px] ml-1 font-mono ${change24h >= 0 ? "text-[#38CFCF]" : "text-red-400"}`}>
                    {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-muted-foreground hover:text-white cursor-pointer"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-[#6B9FFF]/30 bg-gradient-to-br from-[#6B9FFF]/15 via-card/60 to-[#38CFCF]/10 backdrop-blur-xl p-6 shadow-xl"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#6B9FFF]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-[#6B9FFF]" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Your Balance</span>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-4xl font-bold font-mono text-white">
              {balanceLtc.toFixed(8)} LTC
            </span>
            {usdValue !== null && (
              <span className="text-base text-muted-foreground font-mono mb-1">
                ≈ ${usdValue.toFixed(6)} USD
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (balanceLtc / MIN_WITHDRAW_LTC) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {balanceLtc >= MIN_WITHDRAW_LTC
                ? "Ready to withdraw!"
                : `${(MIN_WITHDRAW_LTC - balanceLtc).toFixed(8)} LTC to withdraw`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Claim Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-xl space-y-5"
      >
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-[#6B9FFF]" />
          <h2 className="font-semibold text-base">Claim Free LTC</h2>
        </div>

        {/* Cooldown */}
        {remaining > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400/60 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-amber-400">{cooldownLabel}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">Cooldown Active</p>
              <p className="text-xs text-amber-400/70">Next claim available in {cooldownLabel}</p>
            </div>
          </div>
        )}

        {/* Captcha */}
        <MathCaptcha key={captchaKey} onVerify={setCaptchaOk} />

        {/* Claim button */}
        <AnimatePresence mode="wait">
          <motion.button
            key={claimSuccess ? "success" : "idle"}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => void handleClaim()}
            disabled={!canClaim || claiming}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all cursor-pointer
              ${canClaim && !claiming
                ? claimSuccess
                  ? "bg-[#38CFCF] text-black shadow-lg shadow-[#38CFCF]/30"
                  : "bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] text-white hover:opacity-90 shadow-lg shadow-[#6B9FFF]/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {claiming
              ? "Claiming..."
              : claimSuccess
              ? "✓ Claimed!"
              : adBlockDetected
              ? "Disable Ad Blocker to Claim"
              : remaining > 0
              ? `Cooldown: ${cooldownLabel}`
              : !captchaOk
              ? "Complete verification to claim"
              : "💧 Claim LTC Now"}
          </motion.button>
        </AnimatePresence>
      </motion.div>

      {/* Daily Bonus */}
      <DailyBonus
        streak={user.dailyStreak}
        lastDailyLoginDate={user.lastDailyLoginDate}
        onClaim={() => void handleDaily()}
        loading={dailyLoading}
        ltcPrice={price}
      />

      {/* Earnings Chart */}
      <EarningsChart walletAddress={walletAddress} ltcPrice={price} />

      {/* Referral Panel */}
      <ReferralPanel
        walletAddress={walletAddress}
        referralCode={user.referralCode}
        referralCount={user.referralCount}
        referralEarningsLtc={user.referralEarningsLtc}
        ltcPrice={price}
      />

      {/* Withdraw */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownToLine className="w-5 h-5 text-[#38CFCF]" />
          <h3 className="font-semibold text-base">Withdraw</h3>
        </div>
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-muted/30 border border-border">
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Minimum withdrawal: <span className="text-white font-mono">{MIN_WITHDRAW_LTC} LTC</span>. Funds sent to your connected wallet.
          </p>
        </div>
        <button
          onClick={() => void handleWithdraw()}
          disabled={withdrawLoading || balanceLtc < MIN_WITHDRAW_LTC}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
            ${balanceLtc >= MIN_WITHDRAW_LTC
              ? "bg-gradient-to-r from-[#38CFCF]/80 to-[#38CFCF] text-black hover:opacity-90 shadow-md shadow-[#38CFCF]/20"
              : "bg-muted text-muted-foreground cursor-not-allowed"
            }
          `}
        >
          {withdrawLoading
            ? "Processing..."
            : balanceLtc >= MIN_WITHDRAW_LTC
            ? `Withdraw ${balanceLtc.toFixed(8)} LTC`
            : `Need ${(MIN_WITHDRAW_LTC - balanceLtc).toFixed(8)} more LTC`}
        </button>
      </motion.div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        LTC Faucet • Powered by Litecoin • Prices via CoinGecko
      </p>
    </div>
  );
}
