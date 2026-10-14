import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import { TrendingUp, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  walletAddress: string;
  ltcPrice: number | null;
};

// Raw entry from DB — both fields optional due to legacy data
type RawEntry = {
  date: string;
  amountLtc?: number;
  amountUsd?: number;
  type: "claim" | "daily";
};

// Resolve the LTC amount from an entry, converting legacy USD if needed
function resolveAmount(entry: RawEntry, ltcPrice: number | null): number {
  if (entry.amountLtc !== undefined) return entry.amountLtc;
  if (entry.amountUsd !== undefined && ltcPrice) return entry.amountUsd / ltcPrice;
  return 0;
}

function groupByDate(entries: RawEntry[], ltcPrice: number | null) {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const amount = resolveAmount(e, ltcPrice);
    map[e.date] = (map[e.date] ?? 0) + amount;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, total]) => ({
      date: date.slice(5),
      total: parseFloat(total.toFixed(8)),
    }));
}

export default function EarningsChart({ walletAddress, ltcPrice }: Props) {
  const history = useQuery(api.queries.getEarningsHistory, { walletAddress });

  if (!history) return null;

  const raw = history as RawEntry[];
  const totalLtc = raw.reduce((s, e) => s + resolveAmount(e, ltcPrice), 0);
  const totalUsd = ltcPrice ? totalLtc * ltcPrice : null;
  const data = groupByDate(raw, ltcPrice);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#38CFCF]" />
          <h3 className="font-semibold text-base">Earnings History</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-[#38CFCF]/10 border border-[#38CFCF]/25 rounded-full px-3 py-1">
          <Zap className="w-3 h-3 text-[#38CFCF]" />
          <span className="text-xs text-[#38CFCF] font-mono font-bold">
            {totalLtc.toFixed(8)} LTC
            {totalUsd !== null && (
              <span className="text-[#38CFCF]/60"> ≈${totalUsd.toFixed(4)}</span>
            )}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No earnings yet. Start claiming!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGradLtc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6B9FFF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6B9FFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(6)}
              width={76}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10, 14, 30, 0.9)",
                border: "1px solid rgba(107,159,255,0.3)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(8)} LTC`, "Earned"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#6B9FFF"
              strokeWidth={2}
              fill="url(#earningsGradLtc)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
