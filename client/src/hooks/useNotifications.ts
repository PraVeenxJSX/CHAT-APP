import { useEffect, useCallback, useRef } from "react";

export const useNotifications = () => {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("Notifications not supported");
      return false;
    }

    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === "granted";
    }

    return false;
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (permissionRef.current !== "granted") return;
      if (document.hasFocus()) return; // Don't show if window is focused

      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "neonchat-message",
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch (err) {
        console.error("Notification error:", err);
      }
    },
    []
  );

  return {
    requestPermission,
    showNotification,
    isSupported: "Notification" in window,
  };
};
