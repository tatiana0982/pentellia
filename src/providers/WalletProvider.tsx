"use client";

// src/providers/WalletProvider.tsx
// Single source of truth for wallet balance — shared across Header, Sidebar, all components.
// Fetches ONCE on mount, refreshable on demand. Prevents 3+ duplicate API calls per page.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface WalletState {
  balance: number;
  totalScans: number;
  isLoading: boolean;
  lastFetched: number | null;
}

interface WalletContextType extends WalletState {
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  totalScans: 0,
  isLoading: true,
  lastFetched: null,
  refresh: async () => {},
});

export const useWallet = () => useContext(WalletContext);

// Cache duration: 60 seconds — don't re-fetch within this window
const CACHE_TTL = 60_000;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    balance: 0,
    totalScans: 0,
    isLoading: true,
    lastFetched: null,
  });

  const fetchingRef = useRef(false);

  const fetchWallet = useCallback(async (force = false) => {
    // Skip if already fetching or cache is fresh
    if (fetchingRef.current) return;
    if (
      !force &&
      state.lastFetched &&
      Date.now() - state.lastFetched < CACHE_TTL
    )
      return;

    fetchingRef.current = true;

    try {
      // Single combined endpoint — balance + scan count in one query
      const res = await fetch("/api/subscription/wallet-summary");
      const data = await res.json();

      if (data.success) {
        setState({
          balance: data.balance ?? 0,
          totalScans: data.totalScans ?? 0,
          isLoading: false,
          lastFetched: Date.now(),
        });
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, [state.lastFetched]);

  useEffect(() => {
    fetchWallet(true);
  }, []);

  // Listen for payment success to refresh immediately
  useEffect(() => {
    const onRefresh = () => fetchWallet(true);
    window.addEventListener("wallet-refresh", onRefresh);
    return () => window.removeEventListener("wallet-refresh", onRefresh);
  }, [fetchWallet]);

  return (
    <WalletContext.Provider
      value={{ ...state, refresh: () => fetchWallet(true) }}
    >
      {children}
    </WalletContext.Provider>
  );
}