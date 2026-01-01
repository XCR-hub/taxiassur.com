import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

type NotificationCallback = (notification: Notification) => void;

class RealtimeNotificationManager {
  private subscribers: Set<NotificationCallback> = new Set();
  private notifications: Notification[] = [];
  private channel: any = null;

  async initialize(userId?: string) {
    if (!userId) return;

    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = this.mapPayloadToNotification(payload.new);
          this.addNotification(notification);
        }
      )
      .subscribe();

    await this.loadNotifications(userId);
  }

  private async loadNotifications(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      this.notifications = data.map(this.mapPayloadToNotification);
    }
  }

  private mapPayloadToNotification(payload: any): Notification {
    return {
      id: payload.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      timestamp: new Date(payload.created_at).getTime(),
      read: payload.read || false,
      actionUrl: payload.action_url,
      actionLabel: payload.action_label,
    };
  }

  subscribe(callback: NotificationCallback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private addNotification(notification: Notification) {
    this.notifications.unshift(notification);
    this.subscribers.forEach((callback) => callback(notification));
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  async markAsRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
    }
  }

  async markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    }
  }

  async clear() {
    this.notifications = [];
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.subscribers.clear();
  }
}

export const notificationManager = new RealtimeNotificationManager();

export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  React.useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    setNotifications(notificationManager.getNotifications());

    return unsubscribe;
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead: (id: string) => notificationManager.markAsRead(id),
    markAllAsRead: () => notificationManager.markAllAsRead(),
    clear: () => notificationManager.clear(),
  };
}

import React from 'react';
