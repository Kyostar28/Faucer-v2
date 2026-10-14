// Simple math captcha component
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RefreshCw } from "lucide-react";

type Props = {
  onVerify: (verified: boolean) => void;
};

function generateQuestion() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const ops = ["+", "-", "*"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer: number;
  if (op === "+") answer = a + b;
  else if (op === "-") answer = a - b;
  else answer = a * b;
  return { question: `${a} ${op} ${b}`, answer };
}

export default function MathCaptcha({ onVerify }: Props) {
  const [qa, setQa] = useState(generateQuestion);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);

  const refresh = useCallback(() => {
    setQa(generateQuestion());
    setInput("");
    setError(false);
    setVerified(false);
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = () => {
    if (parseInt(input) === qa.answer) {
      setVerified(true);
      setError(false);
      onVerify(true);
    } else {
      setError(true);
      setVerified(false);
      onVerify(false);
      setInput("");
      setTimeout(refresh, 800);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[#9945FF] font-semibold uppercase tracking-widest">Human Verification</p>
      <div className="flex items-center gap-2">
        <div className="bg-black/40 border border-[#9945FF]/40 rounded-lg px-4 py-2 font-mono text-lg text-white min-w-[100px] text-center select-none">
          {qa.question} = ?
        </div>
        <Input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Answer"
          disabled={verified}
          className={`w-24 bg-black/40 border-[#9945FF]/40 text-white placeholder:text-gray-500 ${error ? "border-red-500" : ""} ${verified ? "border-[#14F195] text-[#14F195]" : ""}`}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={verified ? undefined : check}
          disabled={verified || !input}
          className="text-[#14F195] hover:text-[#14F195]/80"
        >
          {verified ? "✓ Verified" : "Verify"}
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={refresh} className="text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {error && <p className="text-red-400 text-xs">Wrong answer, try again!</p>}
    </div>
  );
}
