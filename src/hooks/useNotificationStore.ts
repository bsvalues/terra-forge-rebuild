import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "terrafusion_notifications";
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load notifications:", e);
  }
  return [];
}

function saveNotifications(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch (e) {
    console.error("Failed to save notifications:", e);
  }
}

// Global state to share across components
let globalNotifications: AppNotification[] = loadNotifications();
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useNotificationStore() {
  const [notifications, setNotifications] = useState<AppNotification[]>(globalNotifications);

  useEffect(() => {
    const listener = () => setNotifications([...globalNotifications]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    globalNotifications = [newNotification, ...globalNotifications].slice(0, MAX_NOTIFICATIONS);
    saveNotifications(globalNotifications);
    notifyListeners();

    return newNotification;
  }, []);

  const markAsRead = useCallback((id: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(globalNotifications);
    notifyListeners();
  }, []);

  const markAllAsRead = useCallback(() => {
    globalNotifications = globalNotifications.map((n) => ({ ...n, read: true }));
    saveNotifications(globalNotifications);
    notifyListeners();
  }, []);

  const clearAll = useCallback(() => {
    globalNotifications = [];
    saveNotifications(globalNotifications);
    notifyListeners();
  }, []);

  const removeNotification = useCallback((id: string) => {
    globalNotifications = globalNotifications.filter((n) => n.id !== id);
    saveNotifications(globalNotifications);
    notifyListeners();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  };
}
