import React from 'react';
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
    console.log('[NotificationManager] Initializing...');

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
          console.log('[NotificationManager] New notification received:', payload.new);
          const notification = this.mapPayloadToNotification(payload.new);
          this.addNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log('[NotificationManager] Channel status:', status);
      });

    await this.loadNotifications();
    console.log('[NotificationManager] Loaded', this.notifications.length, 'notifications');
  }

  private async loadNotifications() {
    console.log('[NotificationManager] Loading notifications from database...');

    // Charger toutes les notifications CRM récentes
    const { data, error } = await supabase
      .from('crm_event_notifications')
      .select('*, lead:crm_leads(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[NotificationManager] Error loading notifications:', error);
      return;
    }

    if (data) {
      console.log('[NotificationManager] Loaded', data.length, 'notifications from DB');
      this.notifications = data.map((item) => this.mapPayloadToNotification.call(this, item));
      // Notifier tous les subscribers que les notifications sont chargées
      this.notifyAll();
    }
  }

  private notifyAll() {
    // Notifier tous les subscribers avec la liste complète des notifications
    this.subscribers.forEach((callback) => {
      // On envoie une notification factice pour déclencher le re-render
      if (this.notifications.length > 0) {
        callback(this.notifications[0]);
      }
    });
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
      read: payload?.is_read === true,
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
        .update({ is_read: true })
        .eq('id', id);
    }
  }

  async markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));

    await supabase
      .from('crm_event_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
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
  const [, setRefresh] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = notificationManager.subscribe(() => {
      // À chaque nouvelle notification ou changement, recharger toutes les notifications
      setNotifications(notificationManager.getNotifications());
      setRefresh(prev => prev + 1);
    });

    // Charger les notifications initiales
    setNotifications(notificationManager.getNotifications());

    // Recharger périodiquement au cas où
    const interval = setInterval(() => {
      setNotifications(notificationManager.getNotifications());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead: async (id: string) => {
      await notificationManager.markAsRead(id);
      setNotifications(notificationManager.getNotifications());
    },
    markAllAsRead: async () => {
      await notificationManager.markAllAsRead();
      setNotifications(notificationManager.getNotifications());
    },
    clear: async () => {
      await notificationManager.clear();
      setNotifications([]);
    },
  };
}
