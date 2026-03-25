"use client";

// src/providers/WalletProvider.tsx
// Single source of truth for wallet balance — shared across Header, Sidebar, all components.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface WalletState {
  balance:     number;
  totalScans:  number;
  totalBought: number;
  isLoading:   boolean;
  lastFetched: number | null;
}

interface WalletContextType extends WalletState {
  refresh: () => Promise<void>;
  /** True when balance is 0 AND user has never topped up (brand-new user) */
  isNewUser: boolean;
  /** True when balance is 0 but user has bought before (exhausted) */
  isEmpty:   boolean;
  /** True when balance > 0 but < threshold (20 INR) */
  isLow:     boolean;
}

const WalletContext = createContext<WalletContextType>({
  balance:     0,
  totalScans:  0,
  totalBought: 0,
  isLoading:   true,
  lastFetched: null,
  isNewUser:   false,
  isEmpty:     false,
  isLow:       false,
  refresh:     async () => {},
});

export const useWallet = () => useContext(WalletContext);

const CACHE_TTL    = 60_000; // 60 seconds
const LOW_THRESHOLD = 20;    // ₹20

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    balance:     0,
    totalScans:  0,
    totalBought: 0,
    isLoading:   true,
    lastFetched: null,
  });

  const fetchingRef = useRef(false);

  const fetchWallet = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    if (!force && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL) return;

    fetchingRef.current = true;

    try {
      const res  = await fetch("/api/subscription/wallet-summary");
      const data = await res.json();

      if (data.success) {
        setState({
          balance:     data.balance     ?? 0,
          totalScans:  data.totalScans  ?? 0,
          totalBought: data.totalBought ?? 0,
          isLoading:   false,
          lastFetched: Date.now(),
        });
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, [state.lastFetched]);

  useEffect(() => { fetchWallet(true); }, []);

  // Listen for payment success / wallet refresh events
  useEffect(() => {
    const onRefresh = () => fetchWallet(true);
    window.addEventListener("wallet-refresh", onRefresh);
    window.addEventListener("refresh-notifications", onRefresh);
    return () => {
      window.removeEventListener("wallet-refresh", onRefresh);
      window.removeEventListener("refresh-notifications", onRefresh);
    };
  }, [fetchWallet]);

  // Derived state
  const isNewUser = !state.isLoading && state.balance === 0 && state.totalBought === 0;
  const isEmpty   = !state.isLoading && state.balance === 0 && state.totalBought > 0;
  const isLow     = !state.isLoading && state.balance > 0 && state.balance < LOW_THRESHOLD;

  return (
    <WalletContext.Provider value={{
      ...state,
      isNewUser,
      isEmpty,
      isLow,
      refresh: () => fetchWallet(true),
    }}>
      {children}
    </WalletContext.Provider>
  );
}