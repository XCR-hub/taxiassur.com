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
      status_change: 'info',
      ai_decision: 'warning',
      email_received: 'info',
    };

    const leadName = payload.lead
      ? `${payload.lead.first_name || ''} ${payload.lead.last_name || ''}`.trim() || payload.lead.email
      : 'Lead inconnu';

    return {
      id: payload.id,
      type: eventTypeMap[payload.event_type] || 'info',
      title: payload.event_type === 'document_uploaded'
        ? 'Nouveau document'
        : payload.event_type === 'new_lead'
        ? 'Nouveau prospect'
        : 'Notification',
      message: payload.message || `Événement: ${payload.event_type}`,
      timestamp: new Date(payload.created_at).getTime(),
      read: payload.is_read || false,
      actionUrl: payload.lead_id ? `/backoffice/crm-killer/pipeline?lead=${payload.lead_id}` : undefined,
      actionLabel: 'Voir le prospect',
    };
  }

  private addNotification(notification: Notification) {
    this.notifications = [notification, ...this.notifications];

    // Notifier tous les subscribers
    this.subscribers.forEach((callback) => callback(notification));
  }

  subscribe(callback: NotificationCallback): () => void {
    this.subscribers.add(callback);

    // Retourner la fonction de désabonnement
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getNotifications(): Notification[] {
    return this.notifications;
  }

  async markAsRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;

      // Mettre à jour dans Supabase
      await supabase
        .from('crm_event_notifications')
        .update({ is_read: true })
        .eq('id', id);
    }
  }

  async markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));

    // Mettre à jour dans Supabase
    await supabase
      .from('crm_event_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
  }

  clear() {
    this.notifications = [];
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

  // Fonction pour charger directement depuis la base
  const loadNotifications = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_event_notifications')
        .select('*, lead:crm_leads(first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useNotifications] Error:', error);
        return;
      }

      if (data) {
        const mapped = data.map((item): Notification => {
          const eventTypeMap: Record<string, NotificationType> = {
            new_lead: 'success',
            document_uploaded: 'info',
            status_change: 'info',
            ai_decision: 'warning',
            email_received: 'info',
          };

          const leadName = item.lead
            ? `${item.lead.first_name || ''} ${item.lead.last_name || ''}`.trim() || item.lead.email
            : 'Lead inconnu';

          return {
            id: item.id,
            type: eventTypeMap[item.event_type] || 'info',
            title: item.event_type === 'document_uploaded'
              ? 'Nouveau document'
              : item.event_type === 'new_lead'
              ? 'Nouveau prospect'
              : 'Notification',
            message: item.message || `Événement: ${item.event_type}`,
            timestamp: new Date(item.created_at).getTime(),
            read: item.is_read || false,
            actionUrl: item.lead_id ? `/backoffice/crm-killer/pipeline?lead=${item.lead_id}` : undefined,
            actionLabel: 'Voir le prospect',
          };
        });

        setNotifications(mapped);
      }
    } catch (error) {
      console.error('[useNotifications] Exception:', error);
    }
  }, []);

  React.useEffect(() => {
    // Charger immédiatement
    loadNotifications();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('notifications_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_event_notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    // Recharger toutes les 5 secondes
    const interval = setInterval(loadNotifications, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead: async (id: string) => {
      await supabase
        .from('crm_event_notifications')
        .update({ is_read: true })
        .eq('id', id);

      await loadNotifications();
    },
    markAllAsRead: async () => {
      await supabase
        .from('crm_event_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      await loadNotifications();
    },
    clear: async () => {
      setNotifications([]);
    },
  };
}
