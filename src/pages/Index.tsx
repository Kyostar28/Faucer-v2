import { useState, useEffect } from "react";
import BlockchainBackground from "@/components/BlockchainBackground.tsx";
import WalletLogin from "./faucet/_components/WalletLogin.tsx";
import FaucetDashboard from "./faucet/_components/FaucetDashboard.tsx";
import DownloadProjectButton from "@/components/DownloadProjectButton.tsx";

const WALLET_KEY = "ltc_faucet_wallet";

export default function Index() {
  const [wallet, setWallet] = useState<string | null>(null);

  // Read referral code from URL param ?ref=CODE
  const refCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;

  useEffect(() => {
    const saved = localStorage.getItem(WALLET_KEY);
    if (saved) setWallet(saved);
  }, []);

  const handleLogin = (address: string) => {
    localStorage.setItem(WALLET_KEY, address);
    setWallet(address);
  };

  const handleLogout = () => {
    localStorage.removeItem(WALLET_KEY);
    setWallet(null);
  };

  return (
    <div className="min-h-screen relative">
      {/* CSS fallback background */}
      <div className="fixed inset-0 z-0" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,159,255,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(56,207,207,0.1) 0%, transparent 60%), oklch(0.07 0.02 240)"
      }} />

      {/* 3D Blockchain background */}
      <BlockchainBackground />

      {/* Gradient overlay for readability */}
      <div className="fixed inset-0 z-[1] bg-gradient-to-b from-background/50 via-transparent to-background/60 pointer-events-none" />

      <div className="fixed bottom-4 right-4 z-20">
        <DownloadProjectButton />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-10">
        {wallet ? (
          <FaucetDashboard walletAddress={wallet} onLogout={handleLogout} />
        ) : (
          <div className="flex items-center justify-center min-h-screen w-full">
            <WalletLogin onLogin={handleLogin} referralCode={refCode} />
          </div>
        )}
      </div>
    </div>
  );
}
