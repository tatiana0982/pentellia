"use client";

// src/hooks/useDomainVerification.ts
import { useState, useEffect, useCallback } from "react";

export interface DomainRecord {
  id: string;
  name: string;
  isVerified: boolean;
  verificationToken: string;
  verificationHost: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useDomainVerification() {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      const data = await res.json();
      if (data.success && data.data) {
        setDomains(data.data);
      }
    } catch (e) {
      console.error("[useDomainVerification] fetch failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const verifiedDomain = domains.find((d) => d.isVerified) ?? null;

  return {
    domains,
    isLoading,
    hasVerifiedDomain: !!verifiedDomain,
    primaryDomain: verifiedDomain,
    refresh: fetchDomains,
  };
}