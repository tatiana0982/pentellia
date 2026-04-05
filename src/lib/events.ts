// lib/events.ts
// Central event bus for cross-component state refresh.
// All components should use these helpers instead of dispatching raw events.

/** Triggers the notification bell to re-fetch unread count + recent items */
export const triggerNotificationRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("refresh-notifications"));
  }
};

/**
 * Triggers the WalletProvider to re-fetch balance from the server.
 * Call this after any operation that changes the wallet:
 *   - Scan completed
 *   - AI summary generated
 *   - Report generated
 *   - Top-up payment verified
 */
export const triggerWalletRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-refresh"));
  }
};

/**
 * Triggers both wallet and notification refresh together.
 * Use after scan completion which produces both a balance change and a notification.
 */
export const triggerFullRefresh = () => {
  triggerWalletRefresh();
  triggerNotificationRefresh();
};