// This app uses wallet-based login (no Hercules Auth).
// User management is handled in convex/faucet.ts.
// This file is kept as a stub for compatibility with src/pages/auth/Callback.tsx.
import { mutation } from "./_generated/server";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (_ctx) => {
    // No-op: wallet-based app does not use OIDC auth
    return null;
  },
});
