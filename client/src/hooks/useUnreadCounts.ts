import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "neonchat_unread_counts";

export const useUnreadCounts = () => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // Update document title with total unread
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      document.title = `(${total}) NeonChat`;
    } else {
      document.title = "NeonChat";
    }
  }, [unreadCounts]);

  const incrementUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || 0) + 1,
    }));
  }, []);

  const clearUnread = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const getUnreadCount = useCallback(
    (conversationId: string) => unreadCounts[conversationId] || 0,
    [unreadCounts]
  );

  const getTotalUnread = useCallback(
    () => Object.values(unreadCounts).reduce((a, b) => a + b, 0),
    [unreadCounts]
  );

  return {
    unreadCounts,
    incrementUnread,
    clearUnread,
    getUnreadCount,
    getTotalUnread,
  };
};
