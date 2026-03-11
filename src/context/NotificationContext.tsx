import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useListNotifications } from "@/api/hooks/useListNotifications";
import { useAckNotification } from "@/api/hooks/useAckNotification";
import type { Notification as ProtoNotification } from "@/gen/proto/jennah_pb";

export type { ProtoNotification };

interface NotificationContextValue {
  notifications: ProtoNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  loading: boolean;
  lastError: string | null;
}

const DISMISSED_KEY = "jennah_dismissed_notifications";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Full refresh every 30 s — keeps the list consistent with server state.
const FULL_POLL_MS = 30_000;
// Incremental check every 5 s — near-real-time for new notifications.
const DELTA_POLL_MS = 5_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ProtoNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { fetchNotifications, loading } = useListNotifications();
  const { ackNotification } = useAckNotification();
  const latestTimestampRef = useRef<bigint>(0n);
  const dismissedRef = useRef<Set<string>>(loadDismissed());

  const filterDismissed = (items: ProtoNotification[]) =>
    items.filter((n) => !dismissedRef.current.has(n.id));

  const mergeNotifications = useCallback((incoming: ProtoNotification[]) => {
    const fresh = filterDismissed(incoming);
    if (!fresh.length) return;
    setNotifications((prev) => {
      const existingById = new Map(prev.map((n) => [n.id, n]));
      const newItems = fresh.filter((n) => !existingById.has(n.id));
      return newItems.length ? [...newItems, ...prev] : prev;
    });
    const max = fresh.reduce((m, n) => (n.occurredAt > m ? n.occurredAt : m), 0n);
    if (max > latestTimestampRef.current) latestTimestampRef.current = max;
  }, []);

  // Full refresh — replaces list, resets unreadCount from server.
  const fullRefresh = useCallback(async () => {
    const res = await fetchNotifications(50);
    if (!res) {
      // fetchNotifications logs to console; also surface it in context
      setLastError("ListNotifications failed — check DevTools console for details.");
      return;
    }
    setLastError(null);
    const items = filterDismissed(res.notifications ?? []);
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.isRead).length);
    if (items.length) {
      latestTimestampRef.current = items.reduce(
        (m, n) => (n.occurredAt > m ? n.occurredAt : m), 0n,
      );
    }
  }, []);

  // Incremental delta fetch — only items newer than what we already have.
  const deltaFetch = useCallback(async () => {
    if (!latestTimestampRef.current) return; // no baseline yet; skip
    const res = await fetchNotifications(20, latestTimestampRef.current);
    if (!res?.notifications?.length) return;
    mergeNotifications(res.notifications);
    setUnreadCount((prev) => prev + (res.unreadCount ?? 0));
  }, [mergeNotifications]);

  useEffect(() => {
    // Initial load
    fullRefresh();

    // Full refresh every 30 s
    const fullTimer = setInterval(fullRefresh, FULL_POLL_MS);

    // Delta poll every 5 s for near-real-time feel
    // (Replace this interval with an EventSource / WebSocket connection once
    //  the backend exposes an SSE endpoint, e.g. GET /sse/notifications)
    const deltaTimer = setInterval(deltaFetch, DELTA_POLL_MS);

    return () => {
      clearInterval(fullTimer);
      clearInterval(deltaTimer);
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await ackNotification(id);
  }, [ackNotification]);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await Promise.all(unread.map((n) => ackNotification(n.id)));
  }, [notifications, ackNotification]);

  const clearAll = useCallback(async () => {
    // Ack all unread on the server so they're marked read
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => ackNotification(n.id)));
    // Persist all current IDs as dismissed — survives page refresh
    const allIds = notifications.map((n) => n.id);
    allIds.forEach((id) => dismissedRef.current.add(id));
    saveDismissed(dismissedRef.current);
    setNotifications([]);
    setUnreadCount(0);
  }, [notifications, ackNotification]);

  return (
    <NotificationContext.Provider
    value={{ notifications, unreadCount, markRead, markAllRead, clearAll, loading, lastError }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

