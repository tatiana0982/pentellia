"use client";

// src/providers/WalletProvider.tsx
// Phase 3: Reads subscription status instead of wallet balance.
// Kept same context shape so header/other consumers don't break.

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface WalletContextType {
  // Legacy fields kept for compatibility (all zero now)
  balance:     number;
  totalSpent:  number;
  totalBought: number;
  totalScans:  number;
  // New subscription fields
  subscription: {
    planId:    string;
    planName:  string;
    status:    string;
    expiresAt: string;
    daysLeft:  number;
  } | null;
  usage: {
    deepScans:  { used: number; limit: number };
    lightScans: { used: number; limit: number };
    reports:    { used: number; limit: number };
  } | null;
  isLoading: boolean;
  refresh:   () => void;
}

const WalletContext = createContext<WalletContextType>({
  balance:      0,
  totalSpent:   0,
  totalBought:  0,
  totalScans:   0,
  subscription: null,
  usage:        null,
  isLoading:    true,
  refresh:      () => {},
});

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [data, setData]         = useState<Omit<WalletContextType, "refresh">>({
    balance:      0,
    totalSpent:   0,
    totalBought:  0,
    totalScans:   0,
    subscription: null,
    usage:        null,
    isLoading:    true,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/wallet-summary");
      const d   = await res.json();
      if (d.success) {
        setData({
          balance:      d.balance      ?? 0,
          totalSpent:   d.totalSpent   ?? 0,
          totalBought:  d.totalBought  ?? 0,
          totalScans:   d.totalScans   ?? 0,
          subscription: d.subscription ?? null,
          usage:        d.usage        ?? null,
          isLoading:    false,
        });
      }
    } catch {
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const id = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <WalletContext.Provider value={{ ...data, refresh: fetchData }}>
      {children}
    </WalletContext.Provider>
  );
}