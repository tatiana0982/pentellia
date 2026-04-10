// src/lib/events.ts
// Central event bus for cross-component state refresh.

/** Triggers the notification bell to re-fetch unread count + recent items */
export const triggerNotificationRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("refresh-notifications"));
  }
};

/** Triggers the WalletProvider to re-fetch subscription status. */
export const triggerWalletRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-refresh"));
  }
};

/** Triggers the dashboard page to re-fetch stats + risk distribution. */
export const triggerDashboardRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashboard-refresh"));
  }
};

/** Triggers notifications + wallet + dashboard refresh together. */
export const triggerFullRefresh = () => {
  triggerNotificationRefresh();
  triggerWalletRefresh();
  triggerDashboardRefresh();
};