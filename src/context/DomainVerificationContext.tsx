"use client";

// src/context/DomainVerificationContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { useDomainVerification, DomainRecord } from "@/hooks/useDomainVerification";

interface DomainVerificationContextType {
  hasVerifiedDomain: boolean;
  isLoading: boolean;
  domains: DomainRecord[];
  primaryDomain: DomainRecord | null;
  refresh: () => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  /** Call before any tool action. Returns true if allowed, false + opens modal if not. */
  requireVerifiedDomain: () => boolean;
}

const DomainVerificationContext = createContext<DomainVerificationContextType>({
  hasVerifiedDomain: false,
  isLoading: true,
  domains: [],
  primaryDomain: null,
  refresh: async () => {},
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  requireVerifiedDomain: () => false,
});

export const useDomainGate = () => useContext(DomainVerificationContext);

export function DomainVerificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const verification = useDomainVerification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const requireVerifiedDomain = useCallback((): boolean => {
    if (verification.isLoading) return false;
    if (verification.hasVerifiedDomain) return true;
    setIsModalOpen(true);
    return false;
  }, [verification.isLoading, verification.hasVerifiedDomain]);

  return (
    <DomainVerificationContext.Provider
      value={{
        ...verification,
        isModalOpen,
        openModal,
        closeModal,
        requireVerifiedDomain,
      }}
    >
      {children}
    </DomainVerificationContext.Provider>
  );
}