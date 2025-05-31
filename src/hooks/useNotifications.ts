import { useCallback } from "react";

export interface NotificationData {
  type: "success" | "error" | "warning" | "info" | "loading";
  title: string;
  message: string;
  duration?: number;
}

export function useNotifications() {
  const addNotification = useCallback((notification: NotificationData) => {
    // Simple console notification for now
    // This can be enhanced to integrate with a toast library or notification system
    console.log(
      `[${notification.type.toUpperCase()}] ${notification.title}: ${
        notification.message
      }`
    );

    // If running in browser, could show browser notification
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    }
  }, []);

  return {
    addNotification,
  };
}
