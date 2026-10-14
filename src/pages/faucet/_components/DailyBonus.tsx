import { motion } from "motion/react";
import { Gift, Check, Lock } from "lucide-react";

// Daily reward tiers in USD x5 (converted to LTC at runtime)
const DAILY_REWARDS_USD = [0.0005, 0.001, 0.0015, 0.002, 0.0025, 0.004, 0.005];

type Props = {
  streak: number;
  lastDailyLoginDate?: string;
  onClaim: () => void;
  loading: boolean;
  ltcPrice: number | null;
};

export default function DailyBonus({ streak, lastDailyLoginDate, onClaim, loading, ltcPrice }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const claimedToday = lastDailyLoginDate === today;
  const currentDay = streak === 0 ? 0 : streak;

  const toLtc = (usd: number) => ltcPrice ? (usd / ltcPrice).toFixed(8) : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-[#6B9FFF]" />
        <h3 className="font-semibold text-base">Daily Login Bonus</h3>
        {claimedToday && (
          <span className="ml-auto text-xs bg-[#38CFCF]/15 text-[#38CFCF] border border-[#38CFCF]/25 px-2 py-0.5 rounded-full">
            Claimed Today
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {DAILY_REWARDS_USD.map((reward, i) => {
          const dayNum = i + 1;
          const isDone = dayNum < currentDay || (dayNum === currentDay && claimedToday);
          const isCurrent = dayNum === (currentDay === 0 ? 1 : currentDay) && !claimedToday;
          const isLocked = !isDone && !isCurrent;

          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 border transition-all
                ${isDone ? "bg-[#38CFCF]/10 border-[#38CFCF]/30" : ""}
                ${isCurrent ? "bg-[#6B9FFF]/20 border-[#6B9FFF]/50 shadow-sm shadow-[#6B9FFF]/20" : ""}
                ${isLocked ? "bg-muted/30 border-border/50 opacity-50" : ""}
              `}
            >
              <span className="text-[9px] text-muted-foreground font-medium">Day {dayNum}</span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${isDone ? "bg-[#38CFCF] text-black" : ""}
                ${isCurrent ? "bg-[#6B9FFF] text-white" : ""}
                ${isLocked ? "bg-muted text-muted-foreground" : ""}
              `}>
                {isDone ? <Check className="w-3 h-3" /> : isLocked ? <Lock className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
              </div>
              <span className={`text-[8px] font-mono font-bold leading-tight text-center
                ${isDone ? "text-[#38CFCF]" : ""}
                ${isCurrent ? "text-[#6B9FFF]" : ""}
                ${isLocked ? "text-muted-foreground" : ""}
              `}>
                {toLtc(reward)}
                <br />
                <span className="opacity-60">LTC</span>
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClaim}
        disabled={claimedToday || loading}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer
          ${claimedToday
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-gradient-to-r from-[#6B9FFF]/80 to-[#38CFCF]/80 hover:from-[#6B9FFF] hover:to-[#38CFCF] text-white shadow-sm shadow-[#6B9FFF]/20"
          }
        `}
      >
        {claimedToday
          ? "Come back tomorrow!"
          : loading
          ? "Claiming..."
          : `Claim Day ${currentDay === 0 ? 1 : currentDay} Bonus (+${toLtc(DAILY_REWARDS_USD[(currentDay === 0 ? 0 : currentDay - 1)])} LTC)`}
      </button>
    </motion.div>
  );
}
