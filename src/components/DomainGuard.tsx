"use client";

// src/components/DomainGuard.tsx
import React from "react";
import { useDomainGate } from "@/context/DomainVerificationContext";

/**
 * Wraps any tool button/link.
 * If the user has no verified domain, clicks open the verification modal.
 *
 * Usage:
 *   <DomainGuard>
 *     <Button onClick={runScan}>Start Scan</Button>
 *   </DomainGuard>
 */
export function DomainGuard({ children }: { children: React.ReactNode }) {
  const { hasVerifiedDomain, isLoading, openModal } = useDomainGate();

  // While loading — let through (server will enforce via requireVerifiedDomain middleware)
  if (isLoading || hasVerifiedDomain) return <>{children}</>;

  return (
    <div
      className="contents"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          openModal();
        }
      }}
    >
      {children}
    </div>
  );
}