import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Wallet, ShieldCheck } from "lucide-react";

// LTC Litecoin logo SVG
function LtcLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="32" fill="url(#ltcBg)" />
      <text x="32" y="46" textAnchor="middle" fontSize="36" fontWeight="bold" fill="white" fontFamily="Arial">Ł</text>
      <defs>
        <linearGradient id="ltcBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B9FFF" />
          <stop offset="1" stopColor="#38CFCF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type Props = {
  onLogin: (wallet: string) => void;
  referralCode?: string;
};

// LTC address validation: P2PKH (L/M), P2SH (3), Bech32 (ltc1)
function isValidLtcAddress(addr: string): boolean {
  return (
    /^[LMmN][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(addr) ||
    /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr) ||
    /^ltc1[a-z0-9]{6,87}$/.test(addr)
  );
}

// Best-effort client IP via ipify
async function getClientIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json() as { ip?: string };
    return data.ip ?? "unknown";
  } catch {
    return "unknown";
  }
}

export default function WalletLogin({ onLogin, referralCode }: Props) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const loginAction = useAction(api.faucet.loginWithWallet);

  const handleLogin = async () => {
    const trimmed = address.trim();
    if (!isValidLtcAddress(trimmed)) {
      toast.error("Invalid Litecoin wallet address. Please check and try again.");
      return;
    }
    setLoading(true);
    try {
      const ip = await getClientIp();
      await loginAction({ walletAddress: trimmed, ip, referralCode });
      onLogin(trimmed);
      toast.success("Wallet connected successfully!");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("Failed to connect wallet");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="relative mb-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6B9FFF] to-[#38CFCF] flex items-center justify-center shadow-lg shadow-[#6B9FFF]/40">
            <LtcLogo size={48} />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#6B9FFF]/30 to-[#38CFCF]/30 blur-md -z-10" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] bg-clip-text text-transparent"
        >
          LTC Faucet
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Free Litecoin rewards every 4 minutes
        </motion.p>
        {referralCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-3 flex items-center gap-1.5 bg-[#6B9FFF]/15 border border-[#6B9FFF]/30 rounded-full px-3 py-1"
          >
            <span className="text-[10px] text-[#6B9FFF] font-semibold">Referred by code:</span>
            <span className="text-[10px] font-mono text-[#38CFCF] font-bold">{referralCode}</span>
          </motion.div>
        )}
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center gap-2 mb-6">
          <Wallet className="w-5 h-5 text-[#6B9FFF]" />
          <h2 className="text-lg font-semibold">Connect Your LTC Wallet</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Enter a valid Litecoin wallet address to start claiming free LTC rewards.
        </p>
        <div className="space-y-4">
          <Input
            placeholder="Enter Litecoin address (L..., M..., ltc1...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
            className="bg-background/60 border-border font-mono text-sm h-11"
          />
          <Button
            onClick={() => void handleLogin()}
            disabled={loading || !address.trim()}
            className="w-full h-11 bg-gradient-to-r from-[#6B9FFF] to-[#38CFCF] hover:opacity-90 text-white font-semibold text-base cursor-pointer border-0"
          >
            {loading ? "Connecting..." : "Connect & Enter Faucet"}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-5 p-3 rounded-xl bg-[#38CFCF]/10 border border-[#38CFCF]/20">
          <ShieldCheck className="w-4 h-4 text-[#38CFCF] shrink-0" />
          <p className="text-xs text-[#38CFCF]/80">
            Your wallet is used for identity only. No private keys required.
          </p>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 gap-3 mt-4"
      >
        {[
          { label: "Cooldown", value: "4 min" },
          { label: "Min Withdraw", value: "0.001 LTC" },
        ].map((s) => (
          <div key={s.label} className="bg-card/40 border border-border rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
