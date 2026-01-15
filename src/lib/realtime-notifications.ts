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
    // Écouter les nouvelles notifications CRM (pour tous les admins)
    this.channel = supabase
      .channel('crm_event_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_event_notifications',
        },
        (payload) => {
          const notification = this.mapPayloadToNotification(payload.new);
          this.addNotification(notification);
        }
      )
      .subscribe();

    await this.loadNotifications();
  }

  private async loadNotifications() {
    // Charger toutes les notifications CRM récentes
    const { data } = await supabase
      .from('crm_event_notifications')
      .select('*, lead:crm_leads(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      this.notifications = data.map((item) => this.mapPayloadToNotification.call(this, item));
    }
  }

  private mapPayloadToNotification(payload: any): Notification {
    const eventTypeMap: Record<string, NotificationType> = {
      new_lead: 'success',
      document_uploaded: 'info',
      documents_complete: 'success',
      quote_sent: 'info',
      quote_accepted: 'success',
      contract_signed: 'success',
      payment_completed: 'success'
    };

    // Protection contre les valeurs undefined
    const eventType = payload?.event_type || 'unknown';
    const createdAt = payload?.created_at ? new Date(payload.created_at).getTime() : Date.now();

    return {
      id: payload?.id || crypto.randomUUID(),
      type: eventTypeMap[eventType] || 'info',
      title: this.getEventTitle(eventType),
      message: payload?.message || 'Notification',
      timestamp: createdAt,
      read: payload?.read_at !== null && payload?.read_at !== undefined,
      actionUrl: payload?.lead_id ? `/backoffice/crm-commercial?lead=${payload.lead_id}` : undefined,
      actionLabel: 'Voir le lead',
    };
  }

  private getEventTitle(eventType: string): string {
    const titles: Record<string, string> = {
      new_lead: '🎉 Nouveau Lead',
      document_uploaded: '📄 Document Reçu',
      documents_complete: '✅ Documents Complets',
      quote_sent: '📧 Devis Envoyé',
      quote_accepted: '🎊 Devis Accepté',
      contract_signed: '✍️ Contrat Signé',
      payment_completed: '💰 Paiement Reçu'
    };
    return titles[eventType] || '🔔 Notification';
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
        .from('crm_event_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    }
  }

  async markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));

    await supabase
      .from('crm_event_notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
  }

  async clear() {
    this.notifications = [];
    await supabase
      .from('crm_event_notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
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
