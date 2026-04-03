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
  isNewUser:   false,
  isEmpty:     false,
  isLow:       false,
  refresh:     async () => {},
});

export const useWallet = () => useContext(WalletContext);

const CACHE_TTL     = 60_000; // 60 seconds
const LOW_THRESHOLD = 20;     // ₹20

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    balance:     0,
    totalScans:  0,
    totalBought: 0,
    isLoading:   true,
  });

  // Fix #5: Store lastFetched in a ref, NOT in state.
  // Keeping it in state caused useCallback to recreate fetchWallet on every
  // fetch completion, which in turn caused the event-listener useEffect to
  // re-run on every render — continuously removing and re-adding the listener
  // and risking an infinite re-render loop.
  const lastFetchedRef = useRef<number | null>(null);
  const fetchingRef    = useRef(false);

  const fetchWallet = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    if (!force && lastFetchedRef.current && Date.now() - lastFetchedRef.current < CACHE_TTL) return;

    fetchingRef.current = true;

    try {
      const res  = await fetch("/api/subscription/wallet-summary");
      const data = await res.json();

      if (data.success) {
        lastFetchedRef.current = Date.now();
        setState({
          balance:     data.balance     ?? 0,
          totalScans:  data.totalScans  ?? 0,
          totalBought: data.totalBought ?? 0,
          isLoading:   false,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      fetchingRef.current = false;
    }
  // No deps — fetchWallet is now a stable reference for the lifetime of
  // the provider. lastFetchedRef is a ref so mutations don't trigger recreation.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWallet(true); }, [fetchWallet]);

  // Fix #16: Only listen to wallet-refresh here.
  // refresh-notifications is a notification-panel concern, not a wallet concern.
  // Mixing them caused extra unnecessary wallet API calls.
  useEffect(() => {
    const onRefresh = () => fetchWallet(true);
    window.addEventListener("wallet-refresh", onRefresh);
    return () => window.removeEventListener("wallet-refresh", onRefresh);
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