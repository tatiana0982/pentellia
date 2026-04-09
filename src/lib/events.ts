// src/lib/events.ts
// Central event bus for cross-component state refresh.

/** Triggers the notification bell to re-fetch unread count + recent items */
export const triggerNotificationRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("refresh-notifications"));
  }
};

/**
 * Triggers the WalletProvider to re-fetch subscription status.
 * Call this after subscription activation or plan changes.
 */
export const triggerWalletRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-refresh"));
  }
};

/**
 * Triggers both subscription and notification refresh together.
 * Use after scan completion which produces a notification.
 */
export const triggerFullRefresh = () => {
  triggerNotificationRefresh();
  triggerWalletRefresh();
};