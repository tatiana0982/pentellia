// lib/events.ts

// Dispatches a custom event that the Header component will listen to
export const triggerNotificationRefresh = () => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("refresh-notifications");
    window.dispatchEvent(event);
  }
};
