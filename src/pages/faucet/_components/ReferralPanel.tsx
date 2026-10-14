import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Copy, Check, ChevronDown, ChevronUp, Gift } from "lucide-react";
import { toast } from "sonner";

type Props = {
  walletAddress: string;
  referralCode?: string;
  referralCount?: number;
  referralEarningsLtc?: number;
  ltcPrice: number | null;
};

export default function ReferralPanel({
  walletAddress,
  referralCode,
  referralCount = 0,
  referralEarningsLtc = 0,
  ltcPrice,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : null;

  const handleCopy = () => {
    if (!referralLink) return;
    void navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const usdValue = ltcPrice ? referralEarningsLtc * ltcPrice : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-6 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6B9FFF]/30 to-[#38CFCF]/20 flex items-center justify-center border border-[#6B9FFF]/30">
          <Users className="w-4 h-4 text-[#6B9FFF]" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm">Referral Program</p>
          <p className="text-xs text-muted-foreground">Earn 25% of your referrals' claims</p>
        </div>
        {/* Stats summary */}
        <div className="hidden sm:flex items-center gap-4 mr-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Referrals</p>
            <p className="text-sm font-bold font-mono text-[#6B9FFF]">{referralCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Earned</p>
            <p className="text-sm font-bold font-mono text-[#38CFCF]">{referralEarningsLtc.toFixed(8)}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expandable body */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 border-t border-border/50 pt-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold font-mono text-[#6B9FFF]">{referralCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">People Referred</p>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold font-mono text-[#38CFCF]">{referralEarningsLtc.toFixed(6)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">LTC Earned</p>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold font-mono text-white">
                    {usdValue !== null ? `$${usdValue.toFixed(4)}` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">USD Value</p>
                </div>
              </div>

              {/* How it works */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#6B9FFF]/10 border border-[#6B9FFF]/20">
                <Gift className="w-4 h-4 text-[#6B9FFF] shrink-0 mt-0.5" />
                <p className="text-xs text-[#6B9FFF]/80">
                  Share your link. When someone registers and claims LTC, you automatically receive <span className="font-bold text-[#6B9FFF]">25%</span> of each claim they make — forever.
                </p>
              </div>

              {/* Referral link */}
              {referralLink ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Your referral link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background/60 border border-border rounded-xl px-3 py-2.5 font-mono text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {referralLink}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Your referral code is being generated...
                </p>
              )}

              {/* Wallet address hint */}
              <p className="text-[10px] text-muted-foreground text-center">
                Code linked to: <span className="font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
